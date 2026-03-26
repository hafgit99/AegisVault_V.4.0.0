// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { BackupService } from '../BackupService';

describe('Import Fuzzing Pilot', () => {
  const password = 'test-password';

  it('1. Malformed JSON should not crash the process', async () => {
    const malformed = [
        '{', 
        '{"format": "invalid"}',
        '{"format": "aegis-encrypted-v1", "payload": "not-base64"}',
        'null',
        'undefined',
        '[1,2,3]',
        '{"format":"aegis-encrypted-v1","salt":"YQ==","iv":"YQ==","payload":"YQ=="}'
    ];

    for (const input of malformed) {
        try {
            await BackupService.decryptBackup(input, password);
        } catch (e) {
            // Expected to throw but NOT to crash or hang
            expect(e).toBeDefined();
        }
    }
  });

  it('2. Large payload resistance', async () => {
      // Simulate a multi-megabyte malformed backup
      const largePayload = 'A'.repeat(1024 * 1024 * 5); // 5MB
      const input = JSON.stringify({
          format: 'aegis-encrypted-v1',
          salt: 'YQ==',
          iv: 'YQ==',
          payload: largePayload
      });

      try {
          await BackupService.decryptBackup(input, password);
      } catch (e) {
          expect(e).toBeDefined();
      }
  });
});
