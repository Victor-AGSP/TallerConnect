import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common';
import { colors, radius, spacing } from '@/constants/theme';
import type { EvidencePickerResult } from '@/hooks/useEvidencePicker';
import type { EvidenceContext } from '@/models/evidence.model';

/**
 * Contextos que el mecánico puede elegir. `presupuesto` se omite: MS4 valida
 * contra MS3 el `presupuesto_id` asociado y esta vista no lo gestiona.
 */
export const MECHANIC_EVIDENCE_CONTEXTS: { value: EvidenceContext; label: string }[] = [
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'reparacion', label: 'Reparación' },
  { value: 'resultado_final', label: 'Resultado final' },
];

export interface EvidencePhotoPickerProps {
  picker: EvidencePickerResult;
  context: EvidenceContext;
  onContextChange: (context: EvidenceContext) => void;
  /** Bloquea los controles mientras hay una operación en curso. */
  disabled?: boolean;
  /** Prefijo de los testID, para usar varios selectores en una pantalla. */
  testIDPrefix?: string;
}

/**
 * Controles de cámara/galería, avisos de permisos, vista previa, etapa de la
 * evidencia y quitar la fotografía. No envía nada.
 */
export function EvidencePhotoPicker({
  picker,
  context,
  onContextChange,
  disabled = false,
  testIDPrefix = 'evidence',
}: EvidencePhotoPickerProps) {
  const { file } = picker;
  const busy = disabled || picker.isPicking;

  return (
    <View>
      <View style={styles.actions}>
        <Button
          testID={`${testIDPrefix}-take-photo`}
          title={file ? 'Tomar otra fotografía' : 'Tomar fotografía'}
          variant="outline"
          disabled={busy}
          onPress={picker.takePhoto}
          style={styles.action}
        />
        <Button
          testID={`${testIDPrefix}-pick-library`}
          title={file ? 'Elegir otra de la galería' : 'Elegir de la galería'}
          variant="outline"
          disabled={busy}
          onPress={picker.pickFromLibrary}
          style={styles.action}
        />
      </View>

      {picker.message ? (
        <Text
          testID={`${testIDPrefix}-picker-message`}
          accessibilityRole="alert"
          style={styles.notice}
        >
          {picker.message}
        </Text>
      ) : null}

      {picker.permissionIssue && picker.canOpenSettings ? (
        <Button
          testID={`${testIDPrefix}-open-settings`}
          title="Abrir Ajustes"
          variant="outline"
          onPress={picker.openSettings}
          style={styles.settings}
        />
      ) : null}

      {file ? (
        <View testID={`${testIDPrefix}-preview`} style={styles.preview}>
          <Image
            source={{ uri: file.uri }}
            style={styles.previewImage}
            accessibilityLabel={`Vista previa de la fotografía ${file.name}`}
          />
          <Text style={styles.previewName}>{file.name}</Text>

          <Text style={styles.label}>Etapa de la evidencia</Text>
          <View style={styles.contexts} accessibilityRole="radiogroup">
            {MECHANIC_EVIDENCE_CONTEXTS.map((option) => {
              const selected = option.value === context;
              return (
                <Pressable
                  key={option.value}
                  testID={`${testIDPrefix}-context-${option.value}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: busy }}
                  disabled={busy}
                  onPress={() => onContextChange(option.value)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button
            testID={`${testIDPrefix}-remove`}
            title="Quitar fotografía"
            variant="outline"
            disabled={busy}
            onPress={picker.clear}
            style={styles.action}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  action: {
    minHeight: 44,
  },
  settings: {
    minHeight: 44,
    marginTop: spacing.sm,
  },
  notice: {
    marginTop: spacing.md,
    color: colors.warning,
    fontSize: 14,
  },
  preview: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },
  previewName: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  label: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  contexts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
  },
  chipTextSelected: {
    fontWeight: '800',
  },
});
