import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, CheckCircle2 } from 'lucide-react';
import { useQRScanner } from '../hooks/useQRSync';
import { ProgressRing } from './ProgressRing';

export const QRScanner = ({
  onScanSuccess,
  onCancel,
  transferCode,
  onTransferCodeChange,
  receiverPairingCode,
  onCopyReceiverPairingCode,
  onRefreshReceiverPairingCode,
}: {
  onScanSuccess: (data: string) => void;
  onCancel: () => void;
  transferCode: string;
  onTransferCodeChange: (value: string) => void;
  receiverPairingCode?: string;
  onCopyReceiverPairingCode?: () => void;
  onRefreshReceiverPairingCode?: () => void;
}) => {
  const { t } = useTranslation();
  const {
    videoRef,
    startScanning,
    stopScanning,
    isScanning,
    progress,
    receivedChunks,
    totalChunks,
    error,
  } = useQRScanner(onScanSuccess);
  const completed = progress === 100;

  useEffect(() => {
    void startScanning();
    return () => stopScanning();
  }, [startScanning, stopScanning]);

  return (
    <div className="qr-scanner-surface flex flex-col items-center justify-center space-y-6 p-8 rounded-3xl border shadow-inner relative min-h-[400px]">
      <div className="text-center z-10">
        <h3 className="text-xl font-bold text-[var(--color-deep-navy)] tracking-tight">
          {t('qrSyncImportTitle', 'Encrypted QR Import')}
        </h3>
        <p className="text-sm opacity-60 mt-1 max-w-sm">
          {t(
            'qrSyncImportDesc',
            'Scan the animated QR frames, then decrypt them with the one-time transfer code from the source device.'
          )}
        </p>
      </div>

      <div className="z-10 w-full max-w-sm rounded-2xl border qr-scanner-box px-4 py-3 shadow-sm">
        <label
          htmlFor="qr-sync-transfer-code"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60"
        >
          {t('qrSyncTransferCodeLabel', 'Transfer Code')}
        </label>
        <input
          id="qr-sync-transfer-code"
          type="text"
          value={transferCode}
          onChange={(event) => onTransferCodeChange(event.target.value)}
          placeholder={t('qrSyncTransferCodePlaceholder', 'Enter the one-time transfer code')}
          className="mt-2 w-full rounded-xl border qr-scanner-input px-4 py-3 text-sm font-[var(--font-geist-mono)] tracking-[0.18em] text-[var(--color-deep-navy)] shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-green)]/40"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        <p className="mt-2 text-xs opacity-70">
          {t(
            'qrSyncTransferCodeImportHint',
            'The QR frames stay encrypted until you enter the matching transfer code.'
          )}
        </p>
      </div>

      {receiverPairingCode ? (
        <div className="z-10 w-full max-w-sm rounded-2xl border qr-scanner-box px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60">
            {t('qrSyncReceiverPairingLabel', 'Optional Receiver Pairing Code')}
          </p>
          <p className="mt-2 break-all rounded-xl bg-black/[0.03] px-3 py-3 font-[var(--font-geist-mono)] text-xs text-[var(--color-deep-navy)]">
            {receiverPairingCode}
          </p>
          <p className="mt-2 text-xs opacity-70">
            {t(
              'qrSyncReceiverPairingHint',
              'Paste this code on the source device before generating the QR transfer to enable receiver-bound ECDH protection.'
            )}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={onCopyReceiverPairingCode}
              className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-[var(--color-deep-navy)] transition hover:bg-black/5"
            >
              {t('copy', 'Copy')}
            </button>
            <button
              onClick={onRefreshReceiverPairingCode}
              className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-[var(--color-deep-navy)] transition hover:bg-black/5"
            >
              {t('qrSyncRefreshPairing', 'Refresh')}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="text-red-600 text-sm font-semibold bg-red-50 p-4 rounded-xl border border-red-500/20 z-10 text-center max-w-[250px]">
          {error}
          <p className="text-xs opacity-70 mt-2 font-normal">
            {t(
              'qrSyncCameraHint',
              'Please allow camera permissions and ensure a camera is connected.'
            )}
          </p>
        </div>
      ) : completed ? (
        <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in slide-in-from-bottom-5 duration-500 z-10">
          <CheckCircle2 className="w-20 h-20 text-[var(--color-sage-green)] mb-6 drop-shadow-md" />
          <p className="font-bold text-2xl text-[var(--color-deep-navy)]">
            {t('qrSyncTransferComplete', 'Transfer complete!')}
          </p>
          <p className="text-sm opacity-60 mt-1">
            {t('qrSyncDecrypting', 'Processing and decrypting vault data...')}
          </p>
        </div>
      ) : (
        <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-[2rem] overflow-hidden border-8 border-white shadow-xl bg-black/5 flex items-center justify-center z-10 group">
          {!isScanning && <Camera className="w-10 h-10 opacity-20 animate-pulse" />}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          <div className="absolute inset-0 border-2 border-[var(--color-sage-green)]/30 m-8 rounded-xl pointer-events-none transition-all duration-300 group-hover:scale-105 group-hover:border-[var(--color-sage-green)]/60">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--color-sage-green)]"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--color-sage-green)]"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--color-sage-green)]"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--color-sage-green)]"></div>
          </div>

          {totalChunks > 0 && (
            <div className="absolute inset-0 bg-[var(--color-deep-navy)]/60 flex flex-col items-center justify-center backdrop-blur-sm transition-all animate-in fade-in duration-300">
              <div className="relative flex items-center justify-center">
                <ProgressRing radius={50} stroke={8} progress={progress} />
                <span className="absolute text-white font-bold text-2xl drop-shadow-sm">
                  {progress}%
                </span>
              </div>
              <p className="text-white text-sm mt-4 font-semibold bg-black/40 px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
                {t('qrSyncReceivingProgress', {
                  received: receivedChunks,
                  total: totalChunks,
                  defaultValue: 'Receiving chunk {{received}}/{{total}}...',
                })}
              </p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onCancel}
        className="mt-4 px-8 py-2.5 rounded-xl border toolbar-control transition-all text-sm font-semibold shadow-sm z-10 active:scale-95"
      >
        {t('cancel', 'Cancel')}
      </button>
    </div>
  );
};
