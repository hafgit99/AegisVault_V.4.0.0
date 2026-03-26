import React from 'react';
import type { VaultEntry } from '../../vaultService';

/**
 * SyncConflictModal — Aegis 4.2 Faz 2 / Adim 2.3
 * 
 * Çatışan senkronizasyon kayıtlarını kullanıcıya gösteren 
 * ve manuel birleştirme (merge) imkanı sağlayan UI bileşeni.
 */

interface SyncConflictModalProps {
  conflicts: Array<{ local: VaultEntry, remote: VaultEntry }>;
  isOpen: boolean;
  onResolve: (resolved: VaultEntry[]) => void;
  onCancel: () => void;
}

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
  conflicts,
  isOpen,
  onResolve,
  onCancel
}) => {
  if (!isOpen || conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex flex-col gap-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Senkronizasyon Çatışması
          </h2>
          <p className="text-sm opacity-60">
            Aynı kayıt için farklı cihazlarda değişiklik yapılmış. Hangi versiyonu saklamak istediğinizi seçin.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {conflicts.map((conflict, idx) => (
            <div key={idx} className="flex flex-col gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-sm font-bold opacity-80 uppercase tracking-widest font-mono">
                {conflict.local.title || 'İsimsiz Kayıt'}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Local Card */}
                <button 
                  onClick={() => onResolve([conflict.local])}
                  className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all"
                >
                  <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Bu Cihaz (Yerel)</div>
                  <div className="text-sm truncate font-medium">{conflict.local.username || 'Kullanıcı adı yok'}</div>
                  <div className="text-[10px] opacity-40 mt-2">
                    Son güncelleme: {new Date(conflict.local.updated_at || 0).toLocaleString()}
                  </div>
                </button>

                {/* Remote Card */}
                <button 
                  onClick={() => onResolve([conflict.remote])}
                  className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-left transition-all"
                >
                  <div className="text-[10px] font-bold text-amber-400 uppercase mb-1">Diğer Cihaz (Uzak)</div>
                  <div className="text-sm truncate font-medium">{conflict.remote.username || 'Kullanıcı adı yok'}</div>
                  <div className="text-[10px] opacity-40 mt-2">
                    Son güncelleme: {new Date(conflict.remote.updated_at || 0).toLocaleString()}
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/5 border-t border-white/5 flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-medium"
          >
            Vazgeç
          </button>
          <button 
            disabled
            className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm opacity-50 cursor-not-allowed"
          >
            Tümünü Otomatik Çöz (LWW)
          </button>
        </div>
      </div>
    </div>
  );
};
