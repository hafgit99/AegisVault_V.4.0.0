import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { VaultEntry } from '../../vaultService';

interface SyncConflictModalProps {
  conflicts: Array<{ local: VaultEntry; remote: VaultEntry }>;
  isOpen: boolean;
  onResolve: (resolved: VaultEntry[]) => void;
  onCancel: () => void;
}

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
  conflicts,
  isOpen,
  onResolve,
  onCancel,
}) => {
  if (!isOpen || conflicts.length === 0) return null;

  return (
    <div className="v5-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="v5-modal-shell v5-sync-conflict-modal flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
        <div className="v5-modal-header flex items-start gap-3 border-b border-white/5 p-6">
          <div className="v5-modal-icon text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Senkronizasyon çakışması</h2>
            <p className="mt-1 text-sm opacity-60">
              Aynı kayıt farklı cihazlarda değişmiş. Saklamak istediğiniz versiyonu seçin.
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {conflicts.map((conflict, idx) => (
            <div
              key={idx}
              className="v5-sync-conflict-card flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="font-mono text-sm font-bold uppercase tracking-widest opacity-80">
                {conflict.local.title || 'İsimsiz kayıt'}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  onClick={() => onResolve([conflict.local])}
                  className="v5-sync-conflict-choice rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-left transition-all hover:bg-emerald-500/10"
                >
                  <div className="mb-1 text-[10px] font-bold uppercase text-emerald-400">
                    Bu cihaz (yerel)
                  </div>
                  <div className="truncate text-sm font-medium">
                    {conflict.local.username || 'Kullanıcı adı yok'}
                  </div>
                  <div className="mt-2 text-[10px] opacity-50">
                    Son güncelleme: {new Date(conflict.local.updated_at || 0).toLocaleString()}
                  </div>
                </button>

                <button
                  onClick={() => onResolve([conflict.remote])}
                  className="v5-sync-conflict-choice rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-left transition-all hover:bg-amber-500/10"
                >
                  <div className="mb-1 text-[10px] font-bold uppercase text-amber-400">
                    Diğer cihaz (uzak)
                  </div>
                  <div className="truncate text-sm font-medium">
                    {conflict.remote.username || 'Kullanıcı adı yok'}
                  </div>
                  <div className="mt-2 text-[10px] opacity-50">
                    Son güncelleme: {new Date(conflict.remote.updated_at || 0).toLocaleString()}
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="v5-modal-actions flex justify-end gap-3 border-t border-white/5 bg-white/5 p-4">
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-6 py-2.5 text-sm font-medium transition-all hover:bg-white/5"
          >
            Vazgeç
          </button>
          <button
            disabled
            className="cursor-not-allowed rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-black opacity-50"
          >
            Tümünü otomatik çöz (LWW)
          </button>
        </div>
      </div>
    </div>
  );
};
