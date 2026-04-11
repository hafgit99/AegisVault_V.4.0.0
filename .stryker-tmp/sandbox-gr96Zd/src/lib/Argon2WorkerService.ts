// @ts-nocheck
import { argon2id } from 'hash-wasm';

export type Argon2OutputType = 'hex' | 'binary';

export interface Argon2Request {
  password: string;
  salt: Uint8Array;
  parallelism: number;
  iterations: number;
  memorySize: number;
  hashLength: number;
  outputType: Argon2OutputType;
}

type PendingTask = {
  resolve: (value: Uint8Array | string) => void;
  reject: (error: Error) => void;
};

export class Argon2WorkerService {
  private static worker: Worker | null = null;
  private static workerFailed = false;
  private static pending = new Map<string, PendingTask>();

  private static createWorker(): Worker | null {
    if (this.workerFailed) return null;
    if (this.worker) return this.worker;

    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null;
    }

    try {
      const worker = new Worker(new URL('../workers/argon2.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (
        event: MessageEvent<{ id: string; result?: Uint8Array | string; error?: string }>
      ) => {
        const { id, result, error } = event.data || {};
        if (!id) return;
        const task = this.pending.get(id);
        if (!task) return;

        this.pending.delete(id);
        if (error) {
          task.reject(new Error(error));
          return;
        }

        task.resolve(result as Uint8Array | string);
      };

      worker.onerror = () => {
        this.workerFailed = true;
        for (const [, task] of this.pending) {
          task.reject(new Error('ARGON2_WORKER_ERROR'));
        }
        this.pending.clear();
        this.worker = null;
      };

      this.worker = worker;
      return worker;
    } catch {
      this.workerFailed = true;
      return null;
    }
  }

  static async derive(request: Argon2Request): Promise<Uint8Array | string> {
    const worker = this.createWorker();
    if (!worker) {
      return argon2id({
        password: request.password,
        salt: request.salt,
        parallelism: request.parallelism,
        iterations: request.iterations,
        memorySize: request.memorySize,
        hashLength: request.hashLength,
        outputType: request.outputType,
      }) as Promise<Uint8Array | string>;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise<Uint8Array | string>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ id, request });
    });
  }

  static async deriveHex(request: Omit<Argon2Request, 'outputType'>): Promise<string> {
    const result = await this.derive({ ...request, outputType: 'hex' });
    if (typeof result !== 'string') {
      throw new Error('ARGON2_INVALID_HEX_RESULT');
    }
    return result;
  }

  static async deriveBinary(request: Omit<Argon2Request, 'outputType'>): Promise<Uint8Array> {
    const result = await this.derive({ ...request, outputType: 'binary' });
    if (!(result instanceof Uint8Array)) {
      throw new Error('ARGON2_INVALID_BINARY_RESULT');
    }
    return result;
  }
}
