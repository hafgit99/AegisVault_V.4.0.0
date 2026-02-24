import { useState, useEffect, useCallback } from 'react';

export function useClipboard(timeoutSeconds = 30) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const copy = useCallback((id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeLeft(timeoutSeconds);
  }, [timeoutSeconds]);

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

  return { copiedId, timeLeft, copy, timeoutSeconds };
}
