import React, { useState, useEffect } from 'react';
import { SyncDeviceService } from '../../lib/SyncDeviceService';
import type { SyncDeviceFingerprint } from '../../lib/SyncDeviceService';

/**
 * SyncDevicesPanel — Aegis 4.2 Faz 2 / Adim 2.2
 *
 * Bagli cihazlar, son sync zamani ve trust revocation UI bileseni.
 */

export const SyncDevicesPanel: React.FC = () => {
  const [devices, setDevices] = useState<SyncDeviceFingerprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    setLoading(true);
    const list = await SyncDeviceService.getDevices();
    setDevices(list);
    setLoading(false);
  }

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Bu cihazın erişimini kaldırmak istediğinize emin misiniz?')) return;
    const success = await SyncDeviceService.revokeDevice(id);
    if (success) {
      loadDevices();
    }
  };

  if (loading) return <div className="p-4 text-center opacity-60">Cihazlar yükleniyor...</div>;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">Senkronizasyon Cihazları</h3>
        <span className="text-xs px-2 py-1 rounded bg-white/10 opacity-70">
          {devices.filter((d) => d.status === 'active').length} Aktif
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {devices.map((device) => (
          <div
            key={device.id}
            className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
              device.isCurrent
                ? 'border-emerald-500/30 bg-emerald-500/5 shadow-sm'
                : device.status === 'revoked'
                  ? 'border-red-500/20 bg-red-500/5 opacity-50 grayscale'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex flex-col overflow-hidden">
              <span className="font-medium flex items-center gap-2 truncate">
                {device.label}
                {device.isCurrent && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                    Bu Cihaz
                  </span>
                )}
              </span>
              <span className="text-[10px] uppercase opacity-40 font-mono tracking-wider">
                {device.id} • Ekleniş: {new Date(device.addedAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {device.status === 'active' && !device.isCurrent && (
                <button
                  onClick={() => handleRevoke(device.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 group transition-colors"
                  title="Erişimi Kaldır"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
                  </svg>
                </button>
              )}
              {device.status === 'revoked' && (
                <span className="text-[10px] px-1.5 py-1 rounded bg-red-500/20 text-red-500 font-bold uppercase tracking-wider">
                  Kaldırıldı
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-[11px] opacity-40 italic flex items-center gap-2">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Cihaz eşleştirme, 4.1'deki QR Setup protokolü ile güvenli ve offline olarak yapılır.
      </div>
    </div>
  );
};
