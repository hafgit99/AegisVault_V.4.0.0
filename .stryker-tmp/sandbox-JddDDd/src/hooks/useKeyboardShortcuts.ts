// @ts-nocheck
import { useEffect } from 'react';

interface ShortcutConfigs {
    onSearch?: () => void;
    onLock?: () => void;
    onNewEntry?: () => void;
    onEscape?: () => void;
}

export const useKeyboardShortcuts = (configs: ShortcutConfigs) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isMod = event.ctrlKey || event.metaKey;

            // Ctrl + F: Search
            if (isMod && event.key === 'f') {
                if (configs.onSearch) {
                    event.preventDefault();
                    configs.onSearch();
                }
            }

            // Ctrl + L: Lock
            if (isMod && event.key === 'l') {
                if (configs.onLock) {
                    event.preventDefault();
                    configs.onLock();
                }
            }

            // Ctrl + N: New Entry
            if (isMod && event.key === 'n') {
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
