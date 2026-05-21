import { useEffect } from 'react';

interface ShortcutConfigs {
  onSearch?: () => void;
  onCommandPalette?: () => void;
  onLock?: () => void;
  onNewEntry?: () => void;
  onEscape?: () => void;
}

export const useKeyboardShortcuts = (configs: ShortcutConfigs) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      // Ctrl + F / Ctrl + K: Focus Search
      if (isMod && (key === 'f' || (key === 'k' && !event.shiftKey))) {
        if (configs.onSearch) {
          event.preventDefault();
          configs.onSearch();
        }
      }

      // Ctrl + P / Ctrl + Shift + K: Toggle Command Palette
      if (isMod && (key === 'p' || (key === 'k' && event.shiftKey))) {
        if (configs.onCommandPalette) {
          event.preventDefault();
          configs.onCommandPalette();
        }
      }

      // Ctrl + L: Lock
      if (isMod && key === 'l') {
        if (configs.onLock) {
          event.preventDefault();
          configs.onLock();
        }
      }

      // Ctrl + N: New Entry
      if (isMod && key === 'n') {
        if (configs.onNewEntry) {
          event.preventDefault();
          configs.onNewEntry();
        }
      }

      // Escape: Close/Clear
      if (event.key === 'Escape') {
        if (configs.onEscape) {
          configs.onEscape();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [configs]);
};
