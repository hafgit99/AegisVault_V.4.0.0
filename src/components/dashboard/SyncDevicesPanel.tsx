import React, { useEffect, useMemo, useState } from 'react';
import { Info, Laptop, RefreshCw, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SyncDeviceService } from '../../lib/SyncDeviceService';
import type { SyncDeviceFingerprint } from '../../lib/SyncDeviceService';

export const SyncDevicesPanel: React.FC = () => {
  const { t } = useTranslation();
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

  const activeDevices = useMemo(
    () => devices.filter((device) => device.status === 'active'),
    [devices]
  );
  const revokedDevices = useMemo(
    () => devices.filter((device) => device.status === 'revoked'),
    [devices]
  );

  const handleRevoke = async (id: string) => {
    if (!window.confirm(t('syncDevicesRevokeConfirm'))) return;
    const success = await SyncDeviceService.revokeDevice(id);
    if (success) {
      loadDevices();
    }
  };

  if (loading) {
    return (
      <div className="v5-workflow-panel rounded-3xl p-6 text-center text-sm font-semibold opacity-70">
        {t('syncDevicesLoading')}
      </div>
    );
  }

  return (
    <div className="v5-workflow-panel rounded-3xl p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="v5-workflow-icon flex h-11 w-11 items-center justify-center rounded-2xl">
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <span className="v5-section-kicker">{t('syncDevicesKicker')}</span>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-deep-navy)] dark:text-white">
              {t('syncDevicesTitle')}
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-deep-navy)]/65 dark:text-white/65">
              {t('syncDevicesDesc')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadDevices}
          className="settings-pill-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('syncDevicesRefresh')}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="v5-workflow-stat rounded-2xl px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-55">
            {t('syncDevicesActive')}
          </div>
          <div className="mt-2 text-2xl font-bold">{activeDevices.length}</div>
        </div>
        <div className="v5-workflow-stat rounded-2xl px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-55">
            {t('syncDevicesRevoked')}
          </div>
          <div className="mt-2 text-2xl font-bold">{revokedDevices.length}</div>
        </div>
        <div className="v5-workflow-stat rounded-2xl px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-55">
            {t('syncDevicesTotal')}
          </div>
          <div className="mt-2 text-2xl font-bold">{devices.length}</div>
        </div>
      </div>

      <div className="space-y-3">
        {devices.length === 0 ? (
          <div className="v5-workflow-empty rounded-2xl border border-dashed px-4 py-5 text-center text-sm">
            {t('syncDevicesEmpty')}
          </div>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              className={`v5-device-card rounded-2xl border p-4 ${
                device.isCurrent
                  ? 'v5-device-card-current'
                  : device.status === 'revoked'
                    ? 'v5-device-card-revoked'
                    : ''
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="v5-device-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
                        {device.label}
                      </span>
                      {device.isCurrent ? (
                        <span className="rounded-full bg-emerald-500/12 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-200">
                          {t('syncDevicesCurrent')}
                        </span>
                      ) : null}
                      {device.status === 'revoked' ? (
                        <span className="rounded-full bg-red-500/12 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-200">
                          {t('syncDevicesRevokedBadge')}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-deep-navy)]/45 dark:text-white/45">
                      {device.id}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-deep-navy)]/60 dark:text-white/60">
                      {t('syncDevicesAddedAt')}: {new Date(device.addedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {device.status === 'active' && !device.isCurrent ? (
                  <button
                    type="button"
                    onClick={() => handleRevoke(device.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-500/15 dark:text-red-200"
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    {t('syncDevicesRevoke')}
                  </button>
                ) : (
                  <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/10 px-3 py-2 text-xs font-bold text-[var(--color-sage-green)]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {device.status === 'revoked'
                      ? t('syncDevicesRevokedBadge')
                      : t('syncDevicesTrusted')}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="v5-workflow-note mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-xs leading-relaxed">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t('syncDevicesOfflineHint')}</span>
      </div>
    </div>
  );
};
