// @ts-nocheck
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useClipboard } from '../useClipboard';

describe('useClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('copies text and starts countdown', () => {
    const { result } = renderHook(() => useClipboard(5));

    act(() => {
      result.current.copy(42, 'secret');
    });

    expect(result.current.copiedId).toBe(42);
    expect(result.current.timeLeft).toBe(5);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('secret');
  });

  it('clears clipboard and copied state when timer expires', () => {
    const { result } = renderHook(() => useClipboard(5));

    act(() => {
      result.current.copy(7, 'top-secret');
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.timeLeft).toBe(0);
    expect(result.current.copiedId).toBeNull();
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('');
  });
});
