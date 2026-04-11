// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Argon2WorkerService } from '../Argon2WorkerService';

const mockRequest = {
  password: 'test-password',
  salt: new Uint8Array(16),
  parallelism: 1,
  iterations: 1,
  memorySize: 256,
  hashLength: 32,
};

function resetService() {
  (Argon2WorkerService as unknown as { workerFailed: boolean }).workerFailed = false;
  (Argon2WorkerService as unknown as { worker: Worker | null }).worker = null;
  (Argon2WorkerService as unknown as { pending: Map<string, unknown> }).pending.clear();
}

describe('Argon2WorkerService Branch Coverage', () => {
  beforeEach(() => resetService());

  // --- deriveHex / deriveBinary guard branches ---
  it('deriveHex throws when result is not string', async () => {
    const origDerive = Argon2WorkerService.derive;
    Argon2WorkerService.derive = vi.fn().mockResolvedValue(new Uint8Array(32));
    await expect(Argon2WorkerService.deriveHex(mockRequest)).rejects.toThrow(
      'ARGON2_INVALID_HEX_RESULT'
    );
    Argon2WorkerService.derive = origDerive;
  });

  it('deriveBinary throws when result is string', async () => {
    const origDerive = Argon2WorkerService.derive;
    Argon2WorkerService.derive = vi.fn().mockResolvedValue('hex-string-result');
    await expect(Argon2WorkerService.deriveBinary(mockRequest)).rejects.toThrow(
      'ARGON2_INVALID_BINARY_RESULT'
    );
    Argon2WorkerService.derive = origDerive;
  });

  // --- Fallback paths ---
  it('falls back when workerFailed is true', async () => {
    (Argon2WorkerService as unknown as { workerFailed: boolean }).workerFailed = true;
    const result = await Argon2WorkerService.deriveHex(mockRequest);
    expect(typeof result).toBe('string');
  });

  it('falls back when Worker constructor is undefined', async () => {
    const originalWorker = globalThis.Worker;
    (globalThis as unknown as { Worker: undefined }).Worker = undefined;
    const result = await Argon2WorkerService.deriveHex(mockRequest);
    expect(typeof result).toBe('string');
    (globalThis as unknown as { Worker: typeof originalWorker }).Worker = originalWorker;
  });

  // --- Worker creation success path ---
  it('creates worker and posts message, resolves via onmessage', async () => {
    let postedData: unknown = null;
    let workerInstance: {
      onmessage: ((e: MessageEvent) => void) | null;
      onerror: ((e: ErrorEvent) => void) | null;
    } | null = null;

    const OrigWorker = globalThis.Worker;
    (globalThis as any).Worker = class FakeWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage(data: unknown) {
        postedData = data;
        // Resolve asynchronously after handler is set
        setTimeout(() => {
          if (this.onmessage && postedData) {
            const msgId = (postedData as { id: string }).id;
            this.onmessage(
              new MessageEvent('message', {
                data: { id: msgId, result: 'abcdef1234567890' },
              })
            );
          }
        }, 0);
      }
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        workerInstance = this;
      }
    };

    resetService();

    const result = await Argon2WorkerService.derive({ ...mockRequest, outputType: 'hex' });
    expect(result).toBe('abcdef1234567890');
    expect(postedData).toBeTruthy();

    (globalThis as unknown as { Worker: typeof OrigWorker }).Worker = OrigWorker;
  });

  // --- Worker onmessage with error ---
  it('worker responds with error message', async () => {
    let postedData: unknown = null;

    const OrigWorker = globalThis.Worker;
    (globalThis as any).Worker = class FakeWorkerErr {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage(data: unknown) {
        postedData = data;
        setTimeout(() => {
          if (this.onmessage && postedData) {
            const msgId = (postedData as { id: string }).id;
            this.onmessage(
              new MessageEvent('message', {
                data: { id: msgId, error: 'WORKER_HASH_FAILED' },
              })
            );
          }
        }, 0);
      }
      constructor() {}
    };

    resetService();

    await expect(Argon2WorkerService.derive({ ...mockRequest, outputType: 'hex' })).rejects.toThrow(
      'WORKER_HASH_FAILED'
    );

    (globalThis as unknown as { Worker: typeof OrigWorker }).Worker = OrigWorker;
  });

  // --- Worker onmessage with missing id ---
  it('worker onmessage ignores message without id', async () => {
    let postedData: unknown = null;
    let msgCount = 0;

    const OrigWorker = globalThis.Worker;
    (globalThis as any).Worker = class FakeWorkerNoId {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage(data: unknown) {
        postedData = data;
        msgCount++;
        setTimeout(() => {
          if (!this.onmessage) return;
          if (msgCount === 1) {
            // First call: send message with no id - should be ignored
            this.onmessage(new MessageEvent('message', { data: {} }));
            // Send another with null data
            this.onmessage(new MessageEvent('message', { data: { id: 'unknown-id' } }));
          }
          // Finally send the correct response
          if (postedData) {
            const msgId = (postedData as { id: string }).id;
            this.onmessage(new MessageEvent('message', { data: { id: msgId, result: 'ok' } }));
          }
        }, 0);
      }
      constructor() {}
    };

    resetService();

    const result = await Argon2WorkerService.derive({ ...mockRequest, outputType: 'hex' });
    expect(result).toBe('ok');

    (globalThis as unknown as { Worker: typeof OrigWorker }).Worker = OrigWorker;
  });

  // --- Worker onerror ---
  it('worker onerror rejects all pending tasks and marks workerFailed', async () => {
    const OrigWorker = globalThis.Worker;
    (globalThis as any).Worker = class FakeWorkerErrEvt {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new ErrorEvent('error'));
          }
        }, 0);
      }
      constructor() {}
    };

    resetService();

    await expect(Argon2WorkerService.derive({ ...mockRequest, outputType: 'hex' })).rejects.toThrow(
      'ARGON2_WORKER_ERROR'
    );
    expect((Argon2WorkerService as unknown as { workerFailed: boolean }).workerFailed).toBe(true);
    expect((Argon2WorkerService as unknown as { worker: Worker | null }).worker).toBeNull();

    (globalThis as unknown as { Worker: typeof OrigWorker }).Worker = OrigWorker;
  });

  // --- Worker constructor throws ---
  it('falls back when Worker constructor throws', async () => {
    const OrigWorker = globalThis.Worker;
    (globalThis as any).Worker = class ThrowingWorker {
      constructor() {
        throw new Error('Cannot create worker');
      }
    };

    resetService();

    const result = await Argon2WorkerService.deriveHex(mockRequest);
    expect(typeof result).toBe('string');
    expect((Argon2WorkerService as unknown as { workerFailed: boolean }).workerFailed).toBe(true);

    (globalThis as unknown as { Worker: typeof OrigWorker }).Worker = OrigWorker;
  });

  // --- Returns existing worker if already created ---
  it('returns existing worker on second call', async () => {
    let createCount = 0;
    const OrigWorker = globalThis.Worker;
    (globalThis as any).Worker = class CountingWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage(data: unknown) {
        const msgId = (data as { id: string }).id;
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data: { id: msgId, result: 'x' } }));
          }
        }, 0);
      }
      constructor() {
        createCount++;
      }
    };

    resetService();

    // First call creates worker
    await Argon2WorkerService.derive({ ...mockRequest, outputType: 'hex' });
    // Second call should reuse existing worker
    await Argon2WorkerService.derive({ ...mockRequest, outputType: 'hex' });

    expect(createCount).toBe(1);

    (globalThis as unknown as { Worker: typeof OrigWorker }).Worker = OrigWorker;
  });

  // --- derive returns binary via fallback ---
  it('derive with binary outputType falls back correctly', async () => {
    (Argon2WorkerService as unknown as { workerFailed: boolean }).workerFailed = true;
    const result = await Argon2WorkerService.derive({ ...mockRequest, outputType: 'binary' });
    expect(result).toBeInstanceOf(Uint8Array);
    expect((result as Uint8Array).length).toBe(32);
  });

  // --- deriveHex success path ---
  it('deriveHex returns string on fallback', async () => {
    (Argon2WorkerService as unknown as { workerFailed: boolean }).workerFailed = true;
    const result = await Argon2WorkerService.deriveHex(mockRequest);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^[a-f0-9]+$/);
  });

  // --- deriveBinary success path ---
  it('deriveBinary returns Uint8Array on fallback', async () => {
    (Argon2WorkerService as unknown as { workerFailed: boolean }).workerFailed = true;
    const result = await Argon2WorkerService.deriveBinary(mockRequest);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
  });
});
