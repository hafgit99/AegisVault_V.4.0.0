import { useState, useEffect, useCallback } from 'react';
import { SecureAppSettings } from '../lib/SecureAppSettings';

const clampClipboardTimeout = (value: number): number =>
  Math.min(300, Math.max(5, Math.round(value)));

export function useClipboard(timeoutSecondsOverride?: number) {
  const [configuredTimeoutSeconds, setConfiguredTimeoutSeconds] = useState<number>(() => {
    if (typeof timeoutSecondsOverride === 'number') {
      return clampClipboardTimeout(timeoutSecondsOverride);
    }
    return clampClipboardTimeout(SecureAppSettings.getClipboardClearSeconds());
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (typeof timeoutSecondsOverride === 'number') {
      setConfiguredTimeoutSeconds(clampClipboardTimeout(timeoutSecondsOverride));
      return;
    }
    const onSettingChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string }>;
      if (customEvent.detail?.key && customEvent.detail.key !== 'clipboardClearSeconds') return;
      setConfiguredTimeoutSeconds(
        clampClipboardTimeout(SecureAppSettings.getClipboardClearSeconds())
      );
    };

    window.addEventListener('aegis-secure-setting-changed', onSettingChanged as EventListener);
    return () =>
      window.removeEventListener('aegis-secure-setting-changed', onSettingChanged as EventListener);
  }, [timeoutSecondsOverride]);

  const copy = useCallback(
    (id: number, text: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeLeft(configuredTimeoutSeconds);
    },
    [configuredTimeoutSeconds]
  );

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Memory sanitization for clipboard
            navigator.clipboard.writeText('');
            setCopiedId(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  return { copiedId, timeLeft, copy, timeoutSeconds: configuredTimeoutSeconds };
}
