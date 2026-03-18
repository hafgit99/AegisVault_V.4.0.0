import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { generateChunks } from '../hooks/useQRSync';

export const QRExporter = ({
  data,
  transferCode,
  expiresAt,
  protectionMode,
  recipientFingerprint,
  onCancel,
}: {
  data: string;
  transferCode: string;
  expiresAt: string;
  protectionMode: 'transfer-code' | 'transfer-code+ecdh';
  recipientFingerprint?: string;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setChunks(generateChunks(data));
  }, [data]);

  useEffect(() => {
    if (chunks.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % chunks.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [chunks]);

  const copyTransferCode = async () => {
    try {
      await navigator.clipboard.writeText(transferCode);
      toast.success(t('qrSyncCodeCopied', 'Transfer code copied.'));
    } catch {
      toast.error(t('qrSyncCodeCopyFailed', 'Transfer code could not be copied.'));
    }
  };

  const expiresLabel = new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[var(--color-cloud-dancer)] rounded-3xl border border-black/5 shadow-inner min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[var(--color-sage-green)] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold opacity-60">{t('qrSyncPreparing', 'Preparing encrypted QR transfer...')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-8 bg-gradient-to-br from-white to-[var(--color-cloud-dancer)] rounded-3xl border border-black/5 shadow-inner">
      <div className="text-center mb-2">
        <h3 className="text-xl font-bold text-[var(--color-deep-navy)] tracking-tight">{t('qrSyncEncryptedTransferTitle', 'Encrypted Device Transfer')}</h3>
        <p className="text-sm opacity-60 mt-1 max-w-xs">
          {t('qrSyncEncryptedTransferDesc', 'These animated QR frames contain only encrypted payload. Enter the transfer code on the receiving device to decrypt the vault data.')}
        </p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60">{t('qrSyncTransferCodeLabel', 'Transfer Code')}</p>
            <p className="mt-1 font-[var(--font-geist-mono)] text-lg font-bold tracking-[0.18em] text-[var(--color-deep-navy)]">{transferCode}</p>
          </div>
          <button onClick={copyTransferCode} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-[var(--color-deep-navy)] transition hover:bg-black/5">
            {t('copy', 'Copy')}
          </button>
        </div>
        <p className="text-xs opacity-70">{t('qrSyncTransferCodeHint', 'Share this one-time code only with the device that will import the transfer.')}</p>
        <div className="grid grid-cols-1 gap-2 text-xs text-[var(--color-deep-navy)]/75">
          <p>{t('qrSyncProtectionMode', { defaultValue: 'Protection mode: {{mode}}', mode: protectionMode === 'transfer-code+ecdh' ? 'Transfer code + ECDH' : 'Transfer code only' })}</p>
          <p>{t('qrSyncExpiryHint', { defaultValue: 'Expires at {{time}}', time: expiresLabel })}</p>
          {recipientFingerprint ? (
            <p>{t('qrSyncRecipientFingerprint', { defaultValue: 'Bound to receiver fingerprint {{fingerprint}}', fingerprint: recipientFingerprint })}</p>
          ) : null}
        </div>
      </div>

      <div className="p-4 bg-white rounded-3xl shadow-md border border-[var(--color-sage-green)]/20 relative">
        <div className="absolute -inset-2 rounded-full blur-2xl bg-[var(--color-sage-green)]/10 -z-10 animate-pulse"></div>
        <QRCodeSVG
          value={chunks[currentIndex]}
          size={240}
          level="L"
          includeMargin={true}
          className="rounded-xl"
        />
      </div>

      <div className="flex items-center gap-3 mt-4 text-sm font-[var(--font-geist-mono)]">
        <div className="w-48 h-2 bg-black/5 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--color-sage-green)] transition-all duration-300" style={{ width: `${((currentIndex + 1) / chunks.length) * 100}%` }}></div>
        </div>
        <span className="opacity-60 font-bold w-12 text-right">{currentIndex + 1}/{chunks.length}</span>
      </div>

      <button onClick={onCancel} className="mt-6 px-8 py-2.5 rounded-xl border border-red-500/20 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all text-sm font-semibold active:scale-95 shadow-sm">
        {t('qrSyncCloseExport', 'Receiving device finished / Close')}
      </button>
    </div>
  );
};
