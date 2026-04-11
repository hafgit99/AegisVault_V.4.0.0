// @ts-nocheck
import { useState, useEffect } from 'react';
import { SecureAppSettings } from '../lib/SecureAppSettings';

export const IDLE_TIMEOUT_OPTIONS = [
  { label: 'Never ??', value: 0 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '4 hours', value: 14400 },
];

/**
 * Hook to automatically lock the vault after a period of inactivity.
 * @param onLock Callback to execute when vault should be locked
 * @param isUnlocked Whether the vault is currently unlocked
 */
export function useAutoLock(onLock: () => void, isUnlocked: boolean) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onSettingChanged = () => {
      setVersion((v) => v + 1);
    };
    window.addEventListener('aegis-secure-setting-changed', onSettingChanged as EventListener);
    return () =>
      window.removeEventListener('aegis-secure-setting-changed', onSettingChanged as EventListener);
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;

    let lastActivityTime = Date.now();
    let lockTimer: ReturnType<typeof setTimeout> | null = null;
    let idleHandle: number | null = null;

    const getCurrentTimeoutMs = (): number => {
      const autoLockMinutes = SecureAppSettings.getAutoLockTime();
      return Math.max(0, autoLockMinutes * 60 * 1000);
    };

    const scheduleNextCheck = () => {
      if (lockTimer) {
        clearTimeout(lockTimer);
        lockTimer = null;
      }
      if (idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle);
        idleHandle = null;
      }

      const timeoutMs = getCurrentTimeoutMs();
      if (timeoutMs <= 0) return;

      const elapsed = Date.now() - lastActivityTime;
      const remainingMs = Math.max(250, timeoutMs - elapsed);

      lockTimer = setTimeout(() => {
        const runLockCheck = () => {
          const currentTimeoutMs = getCurrentTimeoutMs();
          if (currentTimeoutMs <= 0) return;

          const currentElapsed = Date.now() - lastActivityTime;
          if (currentElapsed >= currentTimeoutMs) {
            onLock();
            return;
          }
          scheduleNextCheck();
        };

        if ('requestIdleCallback' in window) {
          idleHandle = window.requestIdleCallback(() => runLockCheck(), { timeout: 1000 });
        } else {
          runLockCheck();
        }
      }, remainingMs);
    };

    const userActivity = () => {
      lastActivityTime = Date.now();
      scheduleNextCheck();
    };

    const events = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll', 'mousedown'];
    events.forEach((e) => window.addEventListener(e, userActivity));

    const onVisibilityChanged = () => {
      if (document.visibilityState === 'visible') {
        scheduleNextCheck();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChanged);

    scheduleNextCheck();

    return () => {
      if (lockTimer) clearTimeout(lockTimer);
      if (idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle);
      }
      document.removeEventListener('visibilitychange', onVisibilityChanged);
      events.forEach((e) => window.removeEventListener(e, userActivity));
    };
  }, [isUnlocked, onLock, version]);
}
