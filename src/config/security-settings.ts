import { useState, useEffect } from 'react';

export const IDLE_TIMEOUT_OPTIONS = [
  { label: 'Never ♾️', value: 0 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '4 hours', value: 14400 },
];

// Helper to interact with settings
export function getIdleTimeout(): number {
  try {
    const val = localStorage.getItem('aegis_idle_timeout');
    if (val !== null) {
      return parseInt(val, 10);
    }
  } catch { /* ignore */ }
  return 300; // default 5 min
}

export function setIdleTimeout(seconds: number) {
  localStorage.setItem('aegis_idle_timeout', seconds.toString());
}

/**
 * Hook to automatically lock the vault after a period of inactivity.
 * @param onLock Callback to execute when vault should be locked (e.g., call vaultService.lock())
 * @param isUnlocked Whether the vault is currently unlocked
 */
export function useAutoLock(onLock: () => void, isUnlocked: boolean) {
  const [setVersion, setSetVersion] = useState(0);

  // Listen to cross-tab settings updates
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'aegis_idle_timeout' && e.newValue !== null) {
        setSetVersion((v) => v + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Sync internal state with external calls if necessary (though React's render cycle will handle component-level updates if we listen manually, but let's keep it simple)
  // To allow same-tab updates to refresh this we could dispatch a custom event.
  // For now, assume it's stable.
  
  useEffect(() => {
    if (!isUnlocked) return;

    let lastActivityTime = Date.now();

    const userActivity = () => {
      lastActivityTime = Date.now();
    };

    // Monitör user activity (fare ve klavye)
    window.addEventListener('click', userActivity);
    window.addEventListener('keydown', userActivity);
    window.addEventListener('mousemove', userActivity);
    window.addEventListener('touchstart', userActivity);

    const lockInterval = setInterval(() => {
      const elapsed = (Date.now() - lastActivityTime) / 1000;
      // Get the latest timeout config in case it changed without re-mounting
      const currentTimeout = getIdleTimeout();
      
      if (currentTimeout > 0 && elapsed >= currentTimeout) {
        onLock();
      }
    }, 10000); // Check every 10 seconds to improve responsiveness over 30s
    
    return () => {
      clearInterval(lockInterval);
      window.removeEventListener('click', userActivity);
      window.removeEventListener('keydown', userActivity);
      window.removeEventListener('mousemove', userActivity);
      window.removeEventListener('touchstart', userActivity);
    };
  }, [isUnlocked, onLock, setVersion]);
}
