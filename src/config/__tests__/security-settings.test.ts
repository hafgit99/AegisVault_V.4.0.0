import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { IDLE_TIMEOUT_OPTIONS, useAutoLock } from '../security-settings';
import { SecureAppSettings } from '../../lib/SecureAppSettings';

describe('security-settings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exposes idle timeout options', () => {
    expect(IDLE_TIMEOUT_OPTIONS[0].value).toBe(0);
    expect(IDLE_TIMEOUT_OPTIONS.at(-1)?.value).toBe(14400);
    expect(IDLE_TIMEOUT_OPTIONS).toHaveLength(7);
  });

  it('does not schedule lock timer when vault is locked', () => {
    const onLock = vi.fn();
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    renderHook(() => useAutoLock(onLock, false));

    expect(timeoutSpy).not.toHaveBeenCalled();
  });

  it('locks when timeout passes and reacts to setting change event', () => {
    const onLock = vi.fn();
    vi.spyOn(SecureAppSettings, 'getAutoLockTime').mockReturnValue(1 / 6); // 10 seconds

    const { unmount } = renderHook(() => useAutoLock(onLock, true));

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onLock).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('aegis-secure-setting-changed', { detail: { key: 'autoLockTime' } })
      );
      window.dispatchEvent(new MouseEvent('mousemove'));
      vi.advanceTimersByTime(10000);
    });
    expect(onLock).toHaveBeenCalledTimes(2);

    unmount();
  });
});
