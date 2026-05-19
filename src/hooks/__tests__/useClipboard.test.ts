import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useClipboard } from '../useClipboard';

describe('useClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
        readText: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as typeof window & { aegisElectron?: unknown }).aegisElectron;
    vi.restoreAllMocks();
  });

  it('copies text and starts countdown', async () => {
    const { result } = renderHook(() => useClipboard(5));

    await act(async () => {
      await result.current.copy(42, 'secret');
    });

    expect(result.current.copiedId).toBe(42);
    expect(result.current.timeLeft).toBe(5);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('secret');
  });

  it('clears clipboard and copied state when timer expires', async () => {
    vi.mocked(navigator.clipboard.readText).mockResolvedValue('top-secret');
    const { result } = renderHook(() => useClipboard(5));

    await act(async () => {
      await result.current.copy(7, 'top-secret');
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(result.current.timeLeft).toBe(0);
    expect(result.current.copiedId).toBeNull();
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('');
  });

  it('does not clear clipboard when another value replaced the copied secret', async () => {
    vi.mocked(navigator.clipboard.readText).mockResolvedValue('user-new-copy');
    const { result } = renderHook(() => useClipboard(5));

    await act(async () => {
      await result.current.copy(9, 'vault-secret');
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('vault-secret');
    expect(result.current.timeLeft).toBe(0);
    expect(result.current.copiedId).toBeNull();
  });

  it('uses Electron secure clipboard bridge when available', async () => {
    const secureClipboardWrite = vi.fn().mockResolvedValue({ success: true });
    const secureClipboardClear = vi.fn().mockResolvedValue({ success: true, cleared: true });
    Object.assign(window, {
      aegisElectron: {
        secureClipboardWrite,
        secureClipboardClear,
      },
    });

    const { result } = renderHook(() => useClipboard(5));

    await act(async () => {
      await result.current.copy(11, 'desktop-secret');
    });

    expect(secureClipboardWrite).toHaveBeenCalledWith('desktop-secret', 5000);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(secureClipboardClear).toHaveBeenCalledWith('desktop-secret');
    expect(result.current.copiedId).toBeNull();
  });
});
