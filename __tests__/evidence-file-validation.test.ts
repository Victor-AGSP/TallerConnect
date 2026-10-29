import { apiClient } from '@/services/api/client';
import {
  DEFAULT_EVIDENCE_MAX_BYTES,
  detectImageSignature,
  EVIDENCE_FILE_POLICY,
  prepareEvidenceFile,
  readEvidenceHeader,
  resolveEvidenceMaxBytes,
  selectionFromPickerResult,
  validateEvidenceFile,
  type EvidenceFileCandidate,
  type EvidenceFilePolicy,
} from '@/utils/evidence-file';

/**
 * SCRUM-109: validación de tipo y tamaño antes de solicitar la carga.
 * Solo datos sintéticos: firmas de cabecera y metadatos inventados.
 */

const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_HEADER = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50,
]);
const EXE_HEADER = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);

const policy: EvidenceFilePolicy = { ...EVIDENCE_FILE_POLICY, maxBytes: 1000 };

function photo(overrides: Partial<EvidenceFileCandidate> = {}): EvidenceFileCandidate {
  return {
    uri: 'file:///data/user/0/app/cache/ImagePicker/sintetica.jpg',
    fileName: 'sintetica.jpg',
    fileSize: 500,
    mimeType: 'image/jpeg',
    type: 'image',
    ...overrides,
  };
}

const noHeader = async () => null;

describe('validateEvidenceFile', () => {
  it('acepta una fotografía JPG válida y conserva solo el nombre base', () => {
    const result = validateEvidenceFile(
      photo({ fileName: 'carpeta/privada/foto.JPG' }),
      'camera',
      policy,
    );

    expect(result).toEqual({
      ok: true,
      file: {
        uri: 'file:///data/user/0/app/cache/ImagePicker/sintetica.jpg',
        name: 'foto.JPG',
        mimeType: 'image/jpeg',
        size: 500,
        source: 'camera',
      },
    });
  });

  it.each([
    ['image/png', 'a.png'],
    ['image/webp', 'a.webp'],
    ['image/jpg', 'a.jpeg'],
  ])('acepta %s', (mimeType, fileName) => {
    expect(validateEvidenceFile(photo({ mimeType, fileName }), 'library', policy).ok).toBe(true);
  });

  it.each([
    ['video/mp4', 'clip.mp4'],
    ['application/pdf', 'doc.pdf'],
    ['application/x-msdownload', 'virus.exe'],
    ['image/gif', 'anim.gif'],
    ['image/heic', 'foto.heic'],
  ])('rechaza el MIME no permitido %s', (mimeType, fileName) => {
    const result = validateEvidenceFile(photo({ mimeType, fileName }), 'library', policy);
    expect(result).toMatchObject({ ok: false, code: 'UNSUPPORTED_TYPE' });
  });

  it('rechaza un video aunque declare un MIME de imagen', () => {
    const result = validateEvidenceFile(photo({ type: 'video' }), 'library', policy);
    expect(result).toMatchObject({ ok: false, code: 'UNSUPPORTED_TYPE' });
  });

  it('rechaza una extensión engañosa que no coincide con el MIME', () => {
    const exe = validateEvidenceFile(
      photo({ fileName: 'foto.jpg.exe' }),
      'library',
      policy,
    );
    const png = validateEvidenceFile(photo({ fileName: 'foto.png' }), 'library', policy);

    expect(exe).toMatchObject({ ok: false, code: 'EXTENSION_MISMATCH' });
    expect(png).toMatchObject({ ok: false, code: 'EXTENSION_MISMATCH' });
  });

  it('no confía en la extensión: un .jpg con MIME ejecutable se rechaza', () => {
    const result = validateEvidenceFile(
      photo({ mimeType: 'application/x-msdownload' }),
      'library',
      policy,
    );
    expect(result).toMatchObject({ ok: false, code: 'UNSUPPORTED_TYPE' });
  });

  it('rechaza un archivo de tamaño cero', () => {
    const result = validateEvidenceFile(photo({ fileSize: 0 }), 'camera', policy);
    expect(result).toMatchObject({ ok: false, code: 'EMPTY_FILE' });
  });

  it('acepta exactamente el tamaño máximo y rechaza un byte más', () => {
    expect(validateEvidenceFile(photo({ fileSize: 1000 }), 'camera', policy).ok).toBe(true);

    const over = validateEvidenceFile(photo({ fileSize: 1001 }), 'camera', policy);
    expect(over).toMatchObject({ ok: false, code: 'TOO_LARGE' });
    expect(over.ok ? '' : over.message).toContain('máximo');
  });

  it.each([
    ['sin MIME', { mimeType: undefined }],
    ['sin tamaño', { fileSize: undefined }],
    ['tamaño negativo', { fileSize: -1 }],
    ['tamaño no numérico', { fileSize: Number.NaN }],
  ])('rechaza metadatos ausentes o inválidos (%s)', (_label, overrides) => {
    const result = validateEvidenceFile(photo(overrides), 'library', policy);
    expect(result).toMatchObject({ ok: false, code: 'MISSING_METADATA' });
  });

  it.each([
    ['vacía', ''],
    ['remota', 'https://example.com/foto.jpg'],
    ['javascript', 'javascript:alert(1)'],
    ['ruta relativa', 'foto.jpg'],
  ])('rechaza una URI inválida (%s)', (_label, uri) => {
    const result = validateEvidenceFile(photo({ uri }), 'library', policy);
    expect(result).toMatchObject({ ok: false, code: 'INVALID_URI' });
  });

  it('acepta las URI locales de Android, iOS y web', () => {
    for (const uri of ['content://media/1', 'ph://ABC', 'blob:http://localhost/x', 'file:///x.jpg']) {
      expect(validateEvidenceFile(photo({ uri, fileName: 'a.jpg' }), 'library', policy).ok).toBe(
        true,
      );
    }
  });

  it('genera un nombre seguro cuando el selector no informa uno', () => {
    const result = validateEvidenceFile(
      photo({ fileName: null, uri: 'content://media/external/images/1', mimeType: 'image/png' }),
      'library',
      policy,
    );
    expect(result).toMatchObject({ ok: true, file: { name: 'evidencia.png' } });
  });

  it('rechaza la ausencia de archivo', () => {
    expect(validateEvidenceFile(null, 'camera', policy)).toMatchObject({
      ok: false,
      code: 'MISSING_FILE',
    });
  });
});

describe('detectImageSignature', () => {
  it('identifica JPG, PNG y WEBP por su firma', () => {
    expect(detectImageSignature(JPEG_HEADER)).toBe('image/jpeg');
    expect(detectImageSignature(PNG_HEADER)).toBe('image/png');
    expect(detectImageSignature(WEBP_HEADER)).toBe('image/webp');
  });

  it('no reconoce ejecutables, cabeceras truncadas ni vacías', () => {
    expect(detectImageSignature(EXE_HEADER)).toBeNull();
    expect(detectImageSignature(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(detectImageSignature(new Uint8Array())).toBeNull();
  });
});

describe('prepareEvidenceFile', () => {
  it('acepta un archivo cuya firma coincide con el MIME', async () => {
    const result = await prepareEvidenceFile(photo(), 'camera', {
      policy,
      readHeader: async () => JPEG_HEADER,
    });
    expect(result.ok).toBe(true);
  });

  it('rechaza un ejecutable renombrado como .jpg con MIME de imagen', async () => {
    const result = await prepareEvidenceFile(photo(), 'library', {
      policy,
      readHeader: async () => EXE_HEADER,
    });
    expect(result).toMatchObject({ ok: false, code: 'SIGNATURE_MISMATCH' });
  });

  it('rechaza un PNG declarado como JPG', async () => {
    const result = await prepareEvidenceFile(photo(), 'library', {
      policy,
      readHeader: async () => PNG_HEADER,
    });
    expect(result).toMatchObject({ ok: false, code: 'SIGNATURE_MISMATCH' });
  });

  it('trata un archivo sin contenido legible como vacío', async () => {
    const result = await prepareEvidenceFile(photo(), 'library', {
      policy,
      readHeader: async () => new Uint8Array(),
    });
    expect(result).toMatchObject({ ok: false, code: 'EMPTY_FILE' });
  });

  it('trata un archivo inexistente o ilegible como error recuperable', async () => {
    const result = await prepareEvidenceFile(photo(), 'library', {
      policy,
      readHeader: async () => {
        throw new Error('ENOENT');
      },
    });
    expect(result).toMatchObject({ ok: false, code: 'UNREADABLE' });
  });

  it('no lee el archivo si los metadatos ya son inválidos', async () => {
    const readHeader = jest.fn(async () => JPEG_HEADER);
    const result = await prepareEvidenceFile(photo({ fileSize: 0 }), 'library', {
      policy,
      readHeader,
    });
    expect(result).toMatchObject({ ok: false, code: 'EMPTY_FILE' });
    expect(readHeader).not.toHaveBeenCalled();
  });

  it('sin lector disponible (Android/iOS) se apoya en los metadatos', async () => {
    const result = await prepareEvidenceFile(photo(), 'camera', { policy, readHeader: noHeader });
    expect(result.ok).toBe(true);
  });
});

describe('readEvidenceHeader', () => {
  it('lee los primeros bytes del File entregado en web', async () => {
    const blobLike = {
      type: 'image/png',
      size: 8,
      slice: () => ({ arrayBuffer: async () => PNG_HEADER.buffer }),
    } as unknown as Blob;

    await expect(readEvidenceHeader(photo({ file: blobLike }))).resolves.toEqual(PNG_HEADER);
  });

  it('devuelve null en plataformas sin archivo legible', async () => {
    await expect(readEvidenceHeader(photo())).resolves.toBeNull();
  });
});

describe('selectionFromPickerResult', () => {
  it('trata la cancelación como selección vacía, no como error', async () => {
    await expect(
      selectionFromPickerResult({ canceled: true, assets: null }, 'camera', { policy }),
    ).resolves.toEqual({ status: 'canceled' });
    await expect(
      selectionFromPickerResult({ canceled: false, assets: [] }, 'camera', { policy }),
    ).resolves.toEqual({ status: 'canceled' });
  });

  it('entrega la fotografía validada', async () => {
    const selection = await selectionFromPickerResult(
      { canceled: false, assets: [photo()] },
      'library',
      { policy, readHeader: noHeader },
    );
    expect(selection).toMatchObject({ status: 'selected', file: { name: 'sintetica.jpg' } });
  });

  it('rechaza selecciones múltiples: el módulo admite una fotografía por envío', async () => {
    const selection = await selectionFromPickerResult(
      { canceled: false, assets: [photo(), photo()] },
      'library',
      { policy, readHeader: noHeader },
    );
    expect(selection).toMatchObject({ status: 'invalid', code: 'MULTIPLE_NOT_SUPPORTED' });
  });

  it('informa el motivo de un archivo inválido', async () => {
    const selection = await selectionFromPickerResult(
      { canceled: false, assets: [photo({ fileSize: 5000 })] },
      'library',
      { policy, readHeader: noHeader },
    );
    expect(selection).toMatchObject({ status: 'invalid', code: 'TOO_LARGE' });
  });
});

describe('política de tamaño', () => {
  it('usa 10 MiB por omisión y acepta solo enteros positivos configurados', () => {
    expect(resolveEvidenceMaxBytes(undefined)).toBe(DEFAULT_EVIDENCE_MAX_BYTES);
    expect(resolveEvidenceMaxBytes('2048')).toBe(2048);
    for (const invalid of ['', '0', '-5', '1.5', 'abc', '99999999999999999999']) {
      expect(resolveEvidenceMaxBytes(invalid)).toBe(DEFAULT_EVIDENCE_MAX_BYTES);
    }
  });
});

describe('aislamiento de la red', () => {
  it('la validación nunca invoca al cliente HTTP', async () => {
    const spies = (['request', 'get', 'post', 'put', 'patch'] as const).map((method) =>
      jest.spyOn(apiClient, method),
    );

    await selectionFromPickerResult(
      { canceled: false, assets: [photo({ mimeType: 'video/mp4' })] },
      'library',
      { policy },
    );
    await prepareEvidenceFile(photo({ fileSize: 99999 }), 'camera', { policy });
    await prepareEvidenceFile(photo(), 'camera', { policy, readHeader: noHeader });

    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });
});
