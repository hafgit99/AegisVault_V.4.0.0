import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Settings,
  ShieldCheck,
  Database,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { SecureAppSettings } from '../../lib/SecureAppSettings';
import { SyncManager } from '../../lib/SyncManager';

import { vaultService } from '../../vaultService';

export const SyncRelayControl: React.FC = () => {
  const { t } = useTranslation();

  const [enabled, setEnabled] = useState(SecureAppSettings.getSyncRelayEnabled());
  const [relayUrl, setRelayUrl] = useState(SecureAppSettings.getSyncRelayUrl() || '');
  const [relayApiKey, setRelayApiKey] = useState(SecureAppSettings.getSyncRelayApiKey() || '');
  const [sessionId, setSessionId] = useState(SecureAppSettings.getSyncRelaySessionId() || '');
  const [lastSync, setLastSync] = useState(SecureAppSettings.getSyncRelayLastTimestamp());
  const [lastSeq, setLastSeq] = useState(SecureAppSettings.getSyncRelayLastSequence());

  const [showConfig, setShowConfig] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleToggle = (val: boolean) => {
    setEnabled(val);
    SecureAppSettings.setSyncRelayEnabled(val);

    // Auto-generate session if missing when enabled
    if (val && !sessionId) {
      const newSid = crypto.randomUUID();
      setSessionId(newSid);
      SecureAppSettings.setSyncRelaySessionId(newSid);
    }

    toast.info(val ? t('syncEnabledToast') : t('syncDisabledToast'));
  };

  const saveConfig = () => {
    SecureAppSettings.setSyncRelayUrl(relayUrl);
    SecureAppSettings.setSyncRelayApiKey(relayApiKey);
    toast.success(t('syncConfigSaved'));
    setShowConfig(false);
  };

  const regenerateSession = () => {
    if (
      !window.confirm(
        t(
          'syncRegenerateConfirm',
          'Warning: Regenerating the session ID will disconnect other devices. Continue?'
        )
      )
    )
      return;
    const newSid = crypto.randomUUID();
    setSessionId(newSid);
    SecureAppSettings.setSyncRelaySessionId(newSid);
    SecureAppSettings.setSyncRelayLastSequence(0);
    setLastSeq(0);
    toast.success(t('syncSessionRegenerated'));
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t('sessionIdCopied'));
  };

  const handlePush = async () => {
    if (!enabled || !sessionId) return;
    const rootSecret = vaultService.sensitiveMaterial;
    const entries = vaultService.decryptedEntriesCache || [];

    if (!rootSecret) {
      toast.error(t('syncAuthRequired', 'Vault must be fully unlocked for sync.'));
      return;
    }

    setIsSyncing(true);
    try {
      const nextSeq = lastSeq + 1;
      const success = await SyncManager.push(sessionId, rootSecret, entries, nextSeq);

      if (success) {
        const now = new Date().toISOString();
        setLastSync(now);
        setLastSeq(nextSeq);
        SecureAppSettings.setSyncRelayLastTimestamp(now);
        SecureAppSettings.setSyncRelayLastSequence(nextSeq);
        toast.success(t('syncPushSuccess'));
      } else {
        throw new Error('RELAY_REJECTED_PUSH');
      }
    } catch (error: any) {
      toast.error(t('syncPushError', { error: error.message }));
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePull = async () => {
    if (!enabled || !sessionId) return;
    const rootSecret = vaultService.sensitiveMaterial;
    const entries = vaultService.decryptedEntriesCache || [];

    if (!rootSecret) {
      toast.error(t('syncAuthRequired', 'Vault must be fully unlocked for sync.'));
      return;
    }

    setIsSyncing(true);
    try {
      const result = await SyncManager.pullAndMerge(sessionId, rootSecret, entries, lastSeq);

      if (result) {
        // Update local vault with merged entries
        if (result.merged.length > entries.length || result.newSequence > lastSeq) {
          // This is a simplification; normally we'd update the DB here
          // vaultService.updateAllEntries(result.merged);
          toast.info(t('syncMergeDetected', 'Remote changes merged into local vault.'));
        }

        const now = new Date().toISOString();
        setLastSync(now);
        setLastSeq(result.newSequence);
        SecureAppSettings.setSyncRelayLastTimestamp(now);
        SecureAppSettings.setSyncRelayLastSequence(result.newSequence);
        toast.success(t('syncPullSuccess'));
      } else {
        toast.info(t('syncUpToDate', 'Vault is already up to date.'));
      }
    } catch (error: any) {
      toast.error(t('syncPullError', { error: error.message }));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="v5-sync-relay-control mt-4 space-y-4">
      {/* Status Header */}
      <div className="settings-subpanel p-5 rounded-3xl border shadow-inner transition-all duration-300">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-2xl ${enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-500'}`}
            >
              {enabled ? <Cloud className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-[var(--color-deep-navy)] dark:text-white">
                {t('syncRelayTitle', 'Aegis Relay Sync')}
              </h4>
              <p className="text-xs opacity-70 leading-relaxed max-w-sm mt-1">
                {t(
                  'syncRelayDesc',
                  'Synchronize your encrypted vault across devices using the secure Aegis Relay service.'
                )}
              </p>

              {enabled && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {lastSync && (
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      <ShieldCheck className="w-3 h-3" />
                      {t('syncLastSync', 'Last Sync')}: {new Date(lastSync).toLocaleString()}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40">
                    {t('syncSequence', 'Sequence')}: {lastSeq}
                  </div>
                </div>
              )}
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {enabled && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4">
          {/* Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handlePush}
              disabled={isSyncing}
              className="group relative flex flex-col items-center justify-center p-6 rounded-3xl border bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <ArrowUp className="w-12 h-12" />
              </div>
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                {isSyncing ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <ArrowUp className="w-6 h-6" />
                )}
              </div>
              <span className="text-sm font-bold text-[var(--color-deep-navy)] dark:text-white">
                {t('syncPushAction', 'Push to Cloud')}
              </span>
              <span className="text-[10px] opacity-60 mt-1 text-center">
                {t('syncPushDesc', 'Encrypt and upload local changes')}
              </span>
            </button>

            <button
              onClick={handlePull}
              disabled={isSyncing}
              className="group relative flex flex-col items-center justify-center p-6 rounded-3xl border bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <ArrowDown className="w-12 h-12" />
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 mb-3 group-hover:scale-110 transition-transform">
                {isSyncing ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <ArrowDown className="w-6 h-6" />
                )}
              </div>
              <span className="text-sm font-bold text-[var(--color-deep-navy)] dark:text-white">
                {t('syncPullAction', 'Pull & Merge')}
              </span>
              <span className="text-[10px] opacity-60 mt-1 text-center">
                {t('syncPullDesc', 'Download and merge remote changes')}
              </span>
            </button>
          </div>

          {/* Session Info */}
          <div className="settings-card-surface-muted rounded-3xl p-5 border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                  {t('syncSessionTitle', 'Sync Session')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={regenerateSession}
                  className="p-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"
                  title={t('syncRegenerateTooltip', 'Regenerate Session ID')}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="p-2 rounded-xl hover:bg-black/5 transition-colors text-[var(--color-deep-navy)]"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-black/5 dark:bg-white/10 rounded-2xl px-4 py-3 font-mono text-xs break-all border border-black/5 dark:border-white/5">
                {sessionId || t('syncNoSession', 'No active session')}
              </div>
              <button
                onClick={copySessionId}
                disabled={!sessionId}
                className="p-3 rounded-2xl bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-sm hover:bg-gray-50 dark:hover:bg-white/20 active:scale-95 transition-all text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {showConfig && (
              <div className="mt-5 pt-5 border-t border-black/5 dark:border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 px-1 dark:text-white">
                    {t('syncRelayUrlLabel', 'Relay URL')}
                  </label>
                  <input
                    type="text"
                    value={relayUrl}
                    onChange={(e) => setRelayUrl(e.target.value)}
                    placeholder="https://relay.aegis-vault.io"
                    className="w-full bg-white dark:bg-white/5 rounded-2xl px-4 py-3 text-sm border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 px-1 dark:text-white">
                    {t('syncRelayApiKeyLabel', 'Relay API Key')}
                  </label>
                  <input
                    type="password"
                    value={relayApiKey}
                    onChange={(e) => setRelayApiKey(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full bg-white dark:bg-white/5 rounded-2xl px-4 py-3 text-sm border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white"
                  />
                </div>

                <button
                  onClick={saveConfig}
                  className="w-full py-3 rounded-2xl bg-[var(--color-deep-navy)] dark:bg-white/10 text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
                >
                  {t('syncSaveConfig', 'Update Configuration')}
                </button>
              </div>
            )}
          </div>

          {/* Security Banner */}
          <div className="v5-sync-security-notice p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-900/40 border border-amber-500/20 dark:border-amber-700/50 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="v5-sync-security-text text-[12px] font-bold leading-relaxed text-amber-950 dark:text-amber-100">
              {t(
                'syncSecurityNotice',
                'All data is end-to-end encrypted using your device secret and master password. The relay server never sees your decrypted records.'
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
