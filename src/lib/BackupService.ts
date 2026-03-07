import { argon2id } from 'hash-wasm';

export interface BackupFormat {
  version: string;
  format: 'aegis-encrypted-v1';
  salt: string;    // Base64
  iv: string;      // Base64
  payload: string; // Base64 encrypted JSON
}

export class BackupService {
  private static readonly ITERATIONS = 3;
  private static readonly MEMORY_SIZE = 65536; // 64 MB

  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const derivedBits = await argon2id({
      password: password,
      salt: salt,
      parallelism: 1,
      iterations: this.ITERATIONS,
      memorySize: this.MEMORY_SIZE,
      hashLength: 32,
      outputType: 'binary',
    });

    return window.crypto.subtle.importKey(
      "raw",
      derivedBits as unknown as BufferSource,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  private static encodeBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static async encryptBackup(data: any[], password: string): Promise<string> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const key = await this.deriveKey(password, salt);
    
    const enc = new TextEncoder();
    const payloadBuffer = enc.encode(JSON.stringify(data));
    
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      payloadBuffer
    );

    const backup: BackupFormat = {
      version: '4.0.0',
      format: 'aegis-encrypted-v1',
      salt: this.encodeBase64(salt),
      iv: this.encodeBase64(iv),
      payload: this.encodeBase64(cipherBuffer)
    };

    return JSON.stringify(backup, null, 2);
  }

  static async decryptBackup(backupContent: string, password: string): Promise<any[]> {
    let backup: BackupFormat;
    try {
      backup = JSON.parse(backupContent);
    } catch {
      throw new Error("INVALID_JSON");
    }

    if (backup.format !== 'aegis-encrypted-v1') {
      throw new Error("UNSUPPORTED_FORMAT");
    }

    const salt = Uint8Array.from(atob(backup.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(backup.iv), c => c.charCodeAt(0));
    const cipherText = Uint8Array.from(atob(backup.payload), c => c.charCodeAt(0));

    const key = await this.deriveKey(password, salt);

    try {
      const plainBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        cipherText
      );
      
      const dec = new TextDecoder();
      return JSON.parse(dec.decode(plainBuffer));
    } catch (err) {
      throw new Error("DECRYPTION_FAILED");
    }
  }
}
