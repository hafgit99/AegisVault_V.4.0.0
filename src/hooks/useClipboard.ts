import { useState, useEffect, useCallback, useRef } from 'react';
import { SecureAppSettings } from '../lib/SecureAppSettings';

const clampClipboardTimeout = (value: number): number =>
  Math.min(300, Math.max(5, Math.round(value)));

type SecureClipboardBridge = {
  secureClipboardWrite?: (
    text: string,
    ttlMs: number
  ) => Promise<{ success?: boolean; error?: string }>;
  secureClipboardClear?: (
    expectedText?: string
  ) => Promise<{ success?: boolean; cleared?: boolean; skipped?: boolean; error?: string }>;
};

const getSecureClipboardBridge = (): SecureClipboardBridge | undefined =>
  (window as Window & { aegisElectron?: SecureClipboardBridge }).aegisElectron;

export function useClipboard(timeoutSecondsOverride?: number) {
  const [configuredTimeoutSeconds, setConfiguredTimeoutSeconds] = useState<number>(() => {
    if (typeof timeoutSecondsOverride === 'number') {
      return clampClipboardTimeout(timeoutSecondsOverride);
    }
    return clampClipboardTimeout(SecureAppSettings.getClipboardClearSeconds());
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const copiedTextRef = useRef<string | null>(null);

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
    async (id: number, text: string): Promise<boolean> => {
      try {
        const electronClipboard = getSecureClipboardBridge();
        if (electronClipboard?.secureClipboardWrite) {
          const result = await electronClipboard.secureClipboardWrite(
            text,
            configuredTimeoutSeconds * 1000
          );
          if (!result?.success) return false;
        } else {
          await navigator.clipboard.writeText(text);
        }
      } catch {
        return false;
      }

      copiedTextRef.current = text;
      setCopiedId(id);
      setTimeLeft(configuredTimeoutSeconds);
      return true;
    },
    [configuredTimeoutSeconds]
  );

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            const copiedText = copiedTextRef.current;

            void (async () => {
              try {
                const electronClipboard = getSecureClipboardBridge();
                if (electronClipboard?.secureClipboardClear) {
                  await electronClipboard.secureClipboardClear(copiedText || undefined);
                  return;
                }

                if (copiedText && typeof navigator.clipboard.readText === 'function') {
                  const currentClipboard = await navigator.clipboard.readText();
                  if (currentClipboard !== copiedText) {
                    copiedTextRef.current = null;
                    setCopiedId(null);
                    return;
                  }
                }

                await navigator.clipboard.writeText(' ');
                await navigator.clipboard.writeText('');
              } catch {
                // Clipboard access can be denied by the browser; UI state still expires.
              } finally {
                copiedTextRef.current = null;
                setCopiedId(null);
              }
            })();

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
