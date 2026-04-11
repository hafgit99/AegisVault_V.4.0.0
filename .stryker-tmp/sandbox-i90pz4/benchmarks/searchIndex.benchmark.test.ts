// @ts-nocheck
// @vitest-environment jsdom
import { vaultService } from '../src/vaultService';
import 'fake-indexeddb/auto';

vi.mock('sql.js', () => ({
  default: vi.fn().mockRejectedValue(new Error('sql.js not available in benchmark env')),
}));

vi.mock('../src/lib/SQLiteOPFS', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/SQLiteOPFS')>();
  return {
    ...actual,
    isOPFSAvailable: () => false,
  };
});

describe('Private Search Index Benchmark', () => {
  it('indexes and queries medium dataset in acceptable time', async () => {
    const dbName = `search_bench_${Date.now()}`;
    const password = 'bench_password_123';
    const secret = 'bench_secret_456';

    await vaultService.initDb(password, secret, dbName, true);

    const totalEntries = 350;
    const t0 = performance.now();
    for (let i = 0; i < totalEntries; i++) {
      await vaultService.addPassword({
        title: `Bench Entry ${i}`,
        username: `bench.user.${i}@example.com`,
        website: `https://bench-${i % 50}.example.com`,
        category: i % 2 === 0 ? 'Finance' : 'Work',
        tags: ['bench', `group-${i % 10}`],
        pass: `Pass#${i}!Strong`,
      });
    }
    const t1 = performance.now();

    const q0 = performance.now();
    const result1 = await vaultService.getPasswords('bench entry 12');
    const result2 = await vaultService.getPasswords('group');
    const q1 = performance.now();

    const indexMs = t1 - t0;
    const queryMs = q1 - q0;

    expect(result1.length).toBeGreaterThan(0);
    expect(result2.length).toBeGreaterThan(0);
    expect(indexMs).toBeLessThan(30000);
    expect(queryMs).toBeLessThan(2500);

    await vaultService.lock();
  }, 90000);
});
