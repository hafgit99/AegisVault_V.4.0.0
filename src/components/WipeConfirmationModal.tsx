import { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { GlowCard } from './ui/GlowCard';
import { useTranslation } from 'react-i18next';

interface WipeConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function WipeConfirmationModal({ onConfirm, onCancel }: WipeConfirmationModalProps) {
  const { t } = useTranslation();
  const [typedPhrase, setTypedPhrase] = useState('');
  const requiredPhrase = t('wipeConfirmationPhrase', 'DELETE ALL DATA');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedPhrase === requiredPhrase) {
      onConfirm();
    }
  };

  return (
    <div
      className="v5-modal-backdrop fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wipe-modal-title"
    >
      <div
        className="absolute inset-0 bg-red-900/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <GlowCard className="wipe-modal-surface v5-modal-shell v5-modal-shell-danger max-w-md w-full border border-red-500/40 rounded-[2rem] p-6 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 slide-in-from-bottom-5">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-gray-500 transition-colors"
          aria-label={t('close', 'Close')}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="v5-modal-header flex flex-col items-center mb-6 text-center">
          <div
            className="v5-modal-icon v5-modal-icon-danger w-16 h-16 bg-red-100/80 text-red-600 rounded-full flex items-center justify-center mb-4 border-4 border-red-500/20 shadow-inner"
            aria-hidden="true"
          >
            <AlertTriangle className="w-8 h-8 flex-shrink-0" />
          </div>
          <h2
            id="wipe-modal-title"
            className="text-2xl font-black text-red-600 tracking-tight uppercase mb-2"
          >
            Critical Warning
          </h2>
          <p className="text-sm font-medium wipe-modal-text leading-relaxed px-4">
            You are about to irreversibly delete{' '}
            <span className="font-bold text-red-600">every single password, note, and setting</span>{' '}
            in your active vault.
          </p>
        </div>

        <div className="wipe-modal-warning-box p-4 rounded-xl border flex gap-3 text-xs mb-6 shadow-sm">
          <Trash2 className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
          <ul className="list-disc list-inside opacity-90 space-y-1">
            <li>All saved accounts & TOTP secrets</li>
            <li>All secure notes</li>
            <li>Vault metadata & master password configuration</li>
            <li className="font-bold text-red-600">This cannot be undone!</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="v5-modal-form flex flex-col gap-4">
          <label
            htmlFor="wipePhraseInput"
            className="text-xs font-bold wipe-modal-label uppercase tracking-widest text-center"
          >
            Type{' '}
            <span className="text-red-600 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded select-all font-mono">
              {requiredPhrase}
            </span>{' '}
            to confirm
          </label>
          <input
            id="wipePhraseInput"
            autoFocus
            type="text"
            placeholder={requiredPhrase}
            value={typedPhrase}
            onChange={(e) => setTypedPhrase(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border outline-none wipe-modal-input shadow-inner focus:ring-2 focus:ring-red-400/40 text-center font-bold text-red-600 tracking-wide uppercase transition-all"
          />
          <button
            type="submit"
            disabled={typedPhrase !== requiredPhrase}
            className="w-full py-3.5 rounded-xl bg-red-600 text-white font-black text-sm uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:grayscale hover:bg-red-700 mt-2"
          >
            Permanently Delete Vault
          </button>
        </form>
      </GlowCard>
    </div>
  );
}
