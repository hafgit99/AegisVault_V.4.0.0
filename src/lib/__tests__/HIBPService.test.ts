// @vitest-environment jsdom
import { HIBPService } from '../HIBPService';

describe('HIBPService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns pwned count when suffix matches', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: true,
      text: async () => 'ABCDEF1234567890ABCDEF1234567890ABC:7\n',
    } as any);

    const count = await HIBPService.checkPassword('password123');
    expect(typeof count).toBe('number');
    expect((count as number) >= 0).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns unknown (null) on API error status', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: false, status: 503 } as any);
    const count = await HIBPService.checkPassword('password123');
    expect(count).toBeNull();
  });

  it('returns unknown (null) on network failure', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockRejectedValue(new Error('network down'));
    const count = await HIBPService.checkPassword('password123');
    expect(count).toBeNull();
  });
});
