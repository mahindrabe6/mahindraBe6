import { MAX_CUSTOM_QR_DATA_URL_LENGTH } from './investmentEngine';

export interface CompressedQrResult {
  ok: boolean;
  dataUrl?: string;
  sizeBytes?: number;
  error?: string;
}

const TARGET_MAX_BYTES = Math.floor(MAX_CUSTOM_QR_DATA_URL_LENGTH * 0.85);

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to decode selected image file.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Compresses and centers a user-uploaded QR code image onto a white canvas
 * so transparent QR screenshots remain scannable and stay well below the
 * Firestore 1 MB document limit.
 */
export async function compressQrImageFile(
  file: File,
): Promise<CompressedQrResult> {
  if (!file.type.startsWith('image/')) {
    return {
      ok: false,
      error: 'Please select a PNG, JPG, or WebP QR code image.',
    };
  }
  if (file.size > 10 * 1024 * 1024) {
    return {
      ok: false,
      error: 'Image file exceeds 10 MB. Please select a smaller screenshot.',
    };
  }

  try {
    const img = await loadImageFromFile(file);
    const maxDims = [640, 480, 360];

    for (const maxDim of maxDims) {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.max(120, Math.round(img.width * scale));
      const height = Math.max(120, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return { ok: false, error: 'Canvas rendering is unavailable in this browser.' };
      }

      // White quiet-zone backing guarantees dark-mode scannability
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Try crisp lossless PNG first for high-contrast QR modules
      const pngDataUrl = canvas.toDataURL('image/png');
      if (pngDataUrl.length <= TARGET_MAX_BYTES) {
        return {
          ok: true,
          dataUrl: pngDataUrl,
          sizeBytes: pngDataUrl.length,
        };
      }

      // Fall back to high-quality WebP or JPEG
      for (const quality of [0.9, 0.78, 0.65]) {
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        if (
          webpDataUrl.startsWith('data:image/webp') &&
          webpDataUrl.length <= TARGET_MAX_BYTES
        ) {
          return {
            ok: true,
            dataUrl: webpDataUrl,
            sizeBytes: webpDataUrl.length,
          };
        }
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        if (jpegDataUrl.length <= TARGET_MAX_BYTES) {
          return {
            ok: true,
            dataUrl: jpegDataUrl,
            sizeBytes: jpegDataUrl.length,
          };
        }
      }
    }

    return {
      ok: false,
      error:
        'Could not compress QR image small enough. Crop tightly around the QR square and try again.',
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Failed to process QR code image.',
    };
  }
}
