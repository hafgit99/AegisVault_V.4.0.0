// @ts-nocheck
import { useState, useEffect } from 'react';
import { X, Lock, ShieldCheck } from 'lucide-react';
import { GlowCard } from './ui/GlowCard';
import { vaultService } from '../vaultService';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

interface ReAuthModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  actionName: string;
}

export function ReAuthModal({ onSuccess, onCancel, actionName }: ReAuthModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsVerifying(true);
    try {
      const isValid = await vaultService.verifyCurrentPassword(password);
      if (isValid) {
        onSuccess();
      } else {
        toast.error(t('invalidCredentials'));
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '';
      const retryAfterMs =
        typeof (error as { retryAfterMs?: unknown })?.retryAfterMs === 'number'
          ? Number((error as { retryAfterMs?: number }).retryAfterMs)
          : 0;
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

      if (errMsg === 'RATE_LIMITED') {
        toast.error(
          t('authRateLimited', `Too many attempts. Try again in ${retryAfterSeconds} seconds.`)
        );
      } else {
        toast.error(t('verificationError'));
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reauth-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <GlowCard className="reauth-surface max-w-sm w-full backdrop-blur-[40px] border border-white/40 rounded-[2rem] p-6 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 slide-in-from-bottom-5">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-gray-500 transition-colors"
          aria-label={t('close', 'Close')}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center mb-6 text-center">
          <div
            className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-3"
            aria-hidden="true"
          >
            <Lock className="w-6 h-6" />
          </div>
          <h2 id="reauth-modal-title" className="text-xl font-bold text-[var(--color-deep-navy)]">
            Re-Authentication Required
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Please enter your Master Password to proceed with {actionName}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="reauth-password" className="sr-only">
            Master Password
          </label>
          <input
            id="reauth-password"
            type="password"
            autoFocus
            placeholder="Master Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border outline-none qr-scanner-input shadow-inner focus:ring-2 focus:ring-[var(--color-sage-green)]/40 text-sm font-mono"
          />
          <button
            type="submit"
            disabled={isVerifying || !password}
            className="btn-ink w-full py-3 rounded-xl bg-[var(--color-deep-navy)] text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isVerifying ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            Verify & Proceed
          </button>
        </form>
      </GlowCard>
    </div>
  );
}
