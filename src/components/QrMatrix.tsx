import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode } from 'lucide-react';
import { QrMode, formatINR } from '../lib/investmentEngine';

interface QrMatrixProps {
  upiUri: string;
  amount?: number;
  qrMode?: QrMode;
  customQrDataUrl?: string | null;
  allowDownload?: boolean;
  sizeClassName?: string;
}

export function QrMatrix({
  upiUri,
  amount,
  qrMode = 'generated',
  customQrDataUrl,
  allowDownload = false,
  sizeClassName = 'w-40 h-40 sm:w-44 sm:h-44',
}: QrMatrixProps) {
  const [generatedDataUrl, setGeneratedDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState(false);

  const usingCustomUpload = Boolean(
    qrMode === 'uploaded' && customQrDataUrl && customQrDataUrl.startsWith('data:image/'),
  );

  useEffect(() => {
    if (usingCustomUpload) {
      return;
    }
    let cancelled = false;
    setQrError(false);

    QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 360,
      color: {
        dark: '#090D16',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) {
          setGeneratedDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [upiUri, usingCustomUpload]);

  const activeImageSrc = usingCustomUpload
    ? (customQrDataUrl as string)
    : generatedDataUrl;

  const ariaAmount =
    typeof amount === 'number' && amount > 0 ? ` for ${formatINR(amount)}` : '';

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="p-3 bg-white rounded-2xl border border-[#E5E2DA] shadow-xs inline-flex items-center justify-center">
        {usingCustomUpload ? (
          <img
            src={activeImageSrc}
            alt={`Merchant UPI Payment QR Code${ariaAmount}`}
            className={`${sizeClassName} object-contain rounded-lg`}
          />
        ) : qrError ? (
          <div
            className={`${sizeClassName} flex flex-col items-center justify-center text-center text-[#64748B] px-3`}
          >
            <QrCode className="w-8 h-8 mb-1.5 opacity-60" />
            <span className="text-[11px] font-semibold">
              Enter a valid UPI ID to generate QR
            </span>
          </div>
        ) : activeImageSrc ? (
          <img
            src={activeImageSrc}
            alt={`Scannable UPI Payment QR Code${ariaAmount}`}
            className={`${sizeClassName} object-contain [image-rendering:pixelated]`}
          />
        ) : (
          <div
            className={`${sizeClassName} bg-slate-100 animate-pulse rounded-lg`}
            aria-label="Generating UPI QR Code"
          />
        )}
      </div>

      {allowDownload && activeImageSrc && !qrError && (
        <a
          href={activeImageSrc}
          download={
            typeof amount === 'number' && amount > 0
              ? `mahindra-be6-upi-qr-${Math.round(amount)}.png`
              : 'mahindra-be6-upi-qr.png'
          }
          className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#E6E8EE] dark:border-white/[0.12] bg-white dark:bg-[#111827] hover:border-[#B86B28] text-[11px] font-bold text-[#0F172A] dark:text-white inline-flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#B86B28] dark:text-[#E08E45]" />
          <span>Save QR Image</span>
        </a>
      )}
    </div>
  );
}
