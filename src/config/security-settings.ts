import { useState, useEffect } from 'react';
import { SecureAppSettings } from '../lib/SecureAppSettings';

export const IDLE_TIMEOUT_OPTIONS = [
  { label: 'Never ♾️', value: 0 },
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

  // Ayar değişikliklerini dinle
  useEffect(() => {
    const onSettingChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string }>;
      // Herhangi bir güvenlik ayarı değiştiğinde versiyonu güncelle (autoLockTime dahil)
      setVersion((v) => v + 1);
    };
    window.addEventListener('aegis-secure-setting-changed', onSettingChanged as EventListener);
    return () => window.removeEventListener('aegis-secure-setting-changed', onSettingChanged as EventListener);
  }, []);
  
  useEffect(() => {
    if (!isUnlocked) return;

    let lastActivityTime = Date.now();

    const userActivity = () => {
      lastActivityTime = Date.now();
    };

    // Monitör user activity (fare, klavye, dokunmatik, ekran kaydırma)
    const events = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll', 'mousedown'];
    events.forEach(e => window.addEventListener(e, userActivity));

    const lockInterval = setInterval(() => {
      const elapsed = (Date.now() - lastActivityTime) / 1000;
      
      // Merkezi ayardan güncel kilit süresini al (Dakikayı saniyeye çevir)
      const autoLockMinutes = SecureAppSettings.getAutoLockTime();
      const currentTimeoutSeconds = autoLockMinutes * 60;
      
      if (currentTimeoutSeconds > 0 && elapsed >= currentTimeoutSeconds) {
        onLock();
      }
    }, 10000); // Her 10 saniyede bir kontrol et
    
    return () => {
      clearInterval(lockInterval);
      events.forEach(e => window.removeEventListener(e, userActivity));
    };
  }, [isUnlocked, onLock, version]);
}
