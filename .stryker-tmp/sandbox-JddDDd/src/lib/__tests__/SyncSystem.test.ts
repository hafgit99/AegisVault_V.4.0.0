// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { SyncCryptoService } from '../SyncCryptoService';
import { SyncDeviceService } from '../SyncDeviceService';
import { SyncEnvelopeUtil } from '../SyncEnvelope';

describe('Sync System Unit Tests', () => {
  const rootSecret = new Uint8Array(32).fill(0x42);

  it('1. SyncCryptoService: Anahtar türetme ve şifreleme/çözme döngüsü', async () => {
    const { encryptionKey, authKey } = await SyncCryptoService.deriveSubKeys(rootSecret);
    
    const originalData = { foo: 'bar', secret: 'aegis-123' };
    const pkg = await SyncCryptoService.encryptAndSign(originalData, encryptionKey, authKey);
    
    expect(pkg.payload).toBeDefined();
    expect(pkg.iv).toBeDefined();
    expect(pkg.hmac).toBeDefined();

    const decrypted = await SyncCryptoService.verifyAndDecrypt(pkg, encryptionKey, authKey);
    expect(decrypted).toEqual(originalData);
  });

  it('2. SyncCryptoService: Geçersiz HMAC imzası reddedilir', async () => {
    const { encryptionKey, authKey } = await SyncCryptoService.deriveSubKeys(rootSecret);
    const pkg = await SyncCryptoService.encryptAndSign({ test: 1 }, encryptionKey, authKey);
    
    // HMAC'i bozalım
    pkg.hmac = 'invalid_hmac_string';
    
    const decrypted = await SyncCryptoService.verifyAndDecrypt(pkg, encryptionKey, authKey);
    expect(decrypted).toBeNull();
  });

  it('3. SyncDeviceService: Yerel cihaz fingerprint üretimi', () => {
    const fp = SyncDeviceService.getLocalFingerprint();
    expect(fp.id).toMatch(/^dv-[0-9a-f]{8}$/);
    expect(fp.status).toBe('active');
  });

  it('4. SyncEnvelopeUtil: Paketleme ve doğrulama', () => {
    const envelope = SyncEnvelopeUtil.create(
        'payload', 'iv', 'hmac', 'device-1', 
        { sessionId: 's1', sequenceNumber: 5, entryCount: 10 }
    );
    
    expect(envelope.sequenceNumber).toBe(5);
    expect(envelope.deviceId).toBe('device-1');
    expect(SyncEnvelopeUtil.validate(envelope)).toBe(true);
  });
});
