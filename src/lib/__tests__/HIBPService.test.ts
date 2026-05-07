// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { HIBPService } from '../HIBPService';

const mockFetchResponse = (response: Partial<Response>): Response => response as Response;

describe('HIBPService', () => {
  beforeEach(() => {
    HIBPService.clearCacheForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns pwned count when suffix matches', async () => {
    const password = 'password123';
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
    const suffix = hash.slice(5);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockFetchResponse({
        ok: true,
        text: async () => `${suffix}:7\nABCDEF1234567890ABCDEF1234567890ABC:1\n`,
      })
    );

    const count = await HIBPService.checkPassword(password);
    expect(count).toBe(7);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(hash.slice(0, 5)), {
      headers: { 'Add-Padding': 'true' },
    });
  });

  it('returns unknown (null) on API error status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockFetchResponse({ ok: false, status: 503 }));
    const count = await HIBPService.checkPassword('password123');
    expect(count).toBeNull();
  });

  it('returns unknown (null) on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const count = await HIBPService.checkPassword('password123');
    expect(count).toBeNull();
  });
});
