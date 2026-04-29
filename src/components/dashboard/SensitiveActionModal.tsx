import { AlertTriangle, Lock } from 'lucide-react';

export interface SensitiveActionDialog {
  kind: 'secret' | 'text' | 'confirm';
  title: string;
  description: string;
  inputLabel?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  resolve: (value: string | boolean | null) => void;
}

interface SensitiveActionModalProps {
  dialog: SensitiveActionDialog;
  value: string;
  onValueChange: (value: string) => void;
  onClose: (value: string | boolean | null) => void;
}

export function SensitiveActionModal({
  dialog,
  value,
  onValueChange,
  onClose,
}: SensitiveActionModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onClose(dialog.kind === 'confirm' ? true : value.trim());
        }}
        className="w-full max-w-md rounded-xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#182233]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sensitive-action-title"
      >
        <div className="mb-4 flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              dialog.danger
                ? 'bg-red-500/10 text-red-600 dark:text-red-300'
                : 'bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)]'
            }`}
          >
            {dialog.danger ? <AlertTriangle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <div>
            <h3
              id="sensitive-action-title"
              className="text-base font-semibold text-[var(--color-deep-navy)]"
            >
              {dialog.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--color-deep-navy)]/70">
              {dialog.description}
            </p>
          </div>
        </div>

        {dialog.kind !== 'confirm' && (
          <label className="mb-5 block text-sm font-medium text-[var(--color-deep-navy)]">
            <span>{dialog.inputLabel}</span>
            <input
              autoFocus
              type={dialog.kind === 'secret' ? 'password' : 'text'}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-[var(--color-deep-navy)] outline-none transition focus:border-[var(--color-sage-green)] focus:ring-2 focus:ring-[var(--color-sage-green)]/20 dark:border-white/10 dark:bg-white/5"
            />
          </label>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose(null)}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-[var(--color-deep-navy)] transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            {dialog.cancelLabel}
          </button>
          <button
            type="submit"
            disabled={dialog.kind !== 'confirm' && value.trim().length === 0}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              dialog.danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[var(--color-sage-green)] hover:brightness-110'
            }`}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
