import { useCallback, useEffect, useRef, useState } from 'react';

import type { Evidence, EvidenceContext, EvidenceFile } from '@/models/evidence.model';
import {
  EvidenceServiceError,
  evidenceService,
  type EvidenceErrorOutcome,
} from '@/services/evidence.service';
import { prepareEvidenceFile } from '@/utils/evidence-file';

export type EvidenceUploadState =
  | { status: 'idle' }
  /** Validando la fotografía y preparando la solicitud. */
  | { status: 'preparing' }
  /** `progress` es `null` cuando la plataforma no informa el total. */
  | { status: 'sending'; progress: number | null }
  /** Comprobando en el servidor si un envío incierto llegó a guardarse. */
  | { status: 'verifying' }
  /** `recovered`: se encontró en el servidor sin volver a enviarla. */
  | { status: 'success'; evidence: Evidence; recovered: boolean }
  | {
      status: 'failed';
      message: string;
      outcome: EvidenceErrorOutcome;
      canceled: boolean;
      /** Se puede reintentar con la misma fotografía. */
      canRetry: boolean;
      file: EvidenceFile;
    };

export interface EvidenceUploadResult {
  state: EvidenceUploadState;
  /** Envía la fotografía; devuelve la evidencia confirmada o `null`. */
  upload: (file: EvidenceFile, context: EvidenceContext) => Promise<Evidence | null>;
  /** Reintenta el último envío fallido de forma segura. */
  retry: () => Promise<Evidence | null>;
  /** Cancela el envío en curso (su resultado queda incierto). */
  cancel: () => void;
  reset: () => void;
}

interface Attempt {
  file: EvidenceFile;
  context: EvidenceContext;
  /** Inicio del primer intento: acota la búsqueda de un envío incierto. */
  startedAt: number;
  outcome: EvidenceErrorOutcome | null;
}

const UNCERTAIN_SUFFIX =
  'No se pudo confirmar si la fotografía se guardó: al reintentar se comprobará primero en el servidor.';

function failureMessage(error: unknown): {
  message: string;
  outcome: EvidenceErrorOutcome;
  canceled: boolean;
} {
  if (!(error instanceof EvidenceServiceError)) {
    return { message: `No fue posible subir la evidencia. ${UNCERTAIN_SUFFIX}`, outcome: 'uncertain', canceled: false };
  }
  const canceled = error.code === 'EVIDENCE_CANCELED';
  if (error.outcome === 'uncertain') {
    return {
      message: canceled
        ? `Envío cancelado. ${UNCERTAIN_SUFFIX}`
        : `${error.message} ${UNCERTAIN_SUFFIX}`,
      outcome: 'uncertain',
      canceled,
    };
  }
  return { message: error.message, outcome: error.outcome, canceled };
}

/**
 * Estados del envío de una evidencia y su reintento seguro.
 *
 * Un POST de evidencia no es idempotente y MS4 no documenta una clave de
 * idempotencia, así que nunca se repite a ciegas:
 * - `retryable` (503/429, MS4 garantiza que no guardó nada): se reenvía.
 * - `uncertain` (timeout, red, cancelación, 5xx, respuesta inválida): se
 *   consulta primero `GET /evidencias`; si ya existe se da por confirmada y si
 *   la consulta falla no se reenvía.
 * - `rejected` / `session`: no se ofrece reintento con la misma fotografía.
 */
export function useEvidenceUpload(orderId: string): EvidenceUploadResult {
  const [state, setState] = useState<EvidenceUploadState>({ status: 'idle' });

  const inFlightRef = useRef(false);
  const attemptRef = useRef<Attempt | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSet = useCallback((next: EvidenceUploadState) => {
    if (isMountedRef.current) setState(next);
  }, []);

  const fail = useCallback(
    (attempt: Attempt, error: unknown) => {
      const { message, outcome, canceled } = failureMessage(error);
      attempt.outcome = outcome;
      safeSet({
        status: 'failed',
        message,
        outcome,
        canceled,
        canRetry: outcome === 'retryable' || outcome === 'uncertain',
        file: attempt.file,
      });
    },
    [safeSet],
  );

  const send = useCallback(
    async (attempt: Attempt): Promise<Evidence | null> => {
      const controller = new AbortController();
      abortRef.current = controller;
      safeSet({ status: 'sending', progress: null });
      try {
        const evidence = await evidenceService.uploadEvidence(
          { orderId, file: attempt.file, context: attempt.context },
          {
            signal: controller.signal,
            onProgress: (progress) => safeSet({ status: 'sending', progress }),
          },
        );
        attempt.outcome = null;
        safeSet({ status: 'success', evidence, recovered: false });
        return evidence;
      } catch (error: unknown) {
        fail(attempt, error);
        return null;
      } finally {
        abortRef.current = null;
      }
    },
    [fail, orderId, safeSet],
  );

  const upload = useCallback(
    async (file: EvidenceFile, context: EvidenceContext) => {
      // Bloqueo síncrono contra la doble pulsación.
      if (inFlightRef.current) return null;
      inFlightRef.current = true;

      const attempt: Attempt = { file, context, startedAt: Date.now(), outcome: null };
      attemptRef.current = attempt;
      safeSet({ status: 'preparing' });

      try {
        const validation = await prepareEvidenceFile(
          {
            uri: file.uri,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.mimeType,
            file: file.webFile,
          },
          file.source,
        );
        if (!validation.ok) {
          fail(attempt, new EvidenceServiceError(validation.message, `EVIDENCE_FILE_${validation.code}`));
          return null;
        }
        return await send(attempt);
      } finally {
        inFlightRef.current = false;
      }
    },
    [fail, safeSet, send],
  );

  const retry = useCallback(async () => {
    const attempt = attemptRef.current;
    if (inFlightRef.current || !attempt) return null;
    if (attempt.outcome !== 'retryable' && attempt.outcome !== 'uncertain') return null;
    inFlightRef.current = true;

    try {
      if (attempt.outcome === 'uncertain') {
        safeSet({ status: 'verifying' });
        let existing: Evidence | null;
        try {
          existing = await evidenceService.findUploadedEvidence(
            orderId,
            attempt.file,
            attempt.startedAt,
          );
        } catch {
          safeSet({
            status: 'failed',
            message:
              'No se pudo comprobar si la fotografía se guardó, por lo que no se volvió a enviar. Revisa tu conexión e inténtalo de nuevo.',
            outcome: 'uncertain',
            canceled: false,
            canRetry: true,
            file: attempt.file,
          });
          return null;
        }

        if (existing) {
          attempt.outcome = null;
          safeSet({ status: 'success', evidence: existing, recovered: true });
          return existing;
        }
      }

      return await send(attempt);
    } finally {
      inFlightRef.current = false;
    }
  }, [orderId, safeSet, send]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    if (inFlightRef.current) return;
    attemptRef.current = null;
    setState({ status: 'idle' });
  }, []);

  return { state, upload, retry, cancel, reset };
}
