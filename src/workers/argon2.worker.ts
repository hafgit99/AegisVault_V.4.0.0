import { argon2id } from 'hash-wasm';
import type { Argon2Request } from '../lib/Argon2WorkerService';

type WorkerMessage = {
  id: string;
  request: Argon2Request;
};

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, request } = event.data;

  try {
    const result = await argon2id({
      password: request.password,
      salt: request.salt,
      parallelism: request.parallelism,
      iterations: request.iterations,
      memorySize: request.memorySize,
      hashLength: request.hashLength,
      outputType: request.outputType,
    });

    self.postMessage({ id, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ARGON2_WORKER_DERIVE_FAILED';
    self.postMessage({ id, error: message });
  }
};
