// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
    it('should call onSearch when Ctrl+F is pressed', () => {
        const onSearch = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onSearch }));

        const event = new KeyboardEvent('keydown', {
            key: 'f',
            ctrlKey: true,
            cancelable: true
        });
        window.dispatchEvent(event);

        expect(onSearch).toHaveBeenCalled();
    });

    it('should call onLock when Ctrl+L is pressed', () => {
        const onLock = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onLock }));

        const event = new KeyboardEvent('keydown', {
            key: 'l',
            ctrlKey: true,
            cancelable: true
        });
        window.dispatchEvent(event);

        expect(onLock).toHaveBeenCalled();
    });

    it('should call onNewEntry when Ctrl+N is pressed', () => {
        const onNewEntry = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onNewEntry }));

        const event = new KeyboardEvent('keydown', {
            key: 'n',
            ctrlKey: true,
            cancelable: true
        });
        window.dispatchEvent(event);

        expect(onNewEntry).toHaveBeenCalled();
    });

    it('should call onEscape when Escape is pressed', () => {
        const onEscape = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onEscape }));

        const event = new KeyboardEvent('keydown', {
            key: 'Escape',
            cancelable: true
        });
        window.dispatchEvent(event);

        expect(onEscape).toHaveBeenCalled();
    });

    it('should prevent default for handled shortcuts', () => {
        const onSearch = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onSearch }));

        const event = new KeyboardEvent('keydown', {
            key: 'f',
            ctrlKey: true,
            cancelable: true
        });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
        window.dispatchEvent(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
    });
});
