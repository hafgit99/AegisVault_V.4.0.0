/**
 * AegisError — Merkezi Hata Yönetim Sınıfı
 *
 * Tüm Aegis servislerinde tutarlı hata yönetimi sağlar.
 * Hata kodları, kullanıcıya gösterilebilir mesajlar ve debugging
 * bilgilerini tek bir yapıda birleştirir.
 *
 * @module AegisError
 */
// @ts-nocheck


// ─── Hata Kodları ────────────────────────────────────────────────

export type AegisErrorCode =
  // Kimlik doğrulama
  | 'AUTH_INVALID_PASSWORD'
  | 'AUTH_RATE_LIMITED'
  | 'AUTH_VAULT_LOCKED'
  | 'AUTH_SESSION_EXPIRED'
  // Kriptografi
  | 'CRYPTO_ENCRYPTION_FAILED'
  | 'CRYPTO_DECRYPTION_FAILED'
  | 'CRYPTO_KEY_DERIVATION_FAILED'
  | 'CRYPTO_HMAC_VERIFICATION_FAILED'
  // Depolama
  | 'STORAGE_OPFS_UNAVAILABLE'
  | 'STORAGE_SQLITE_INIT_FAILED'
  | 'STORAGE_IDB_FALLBACK'
  | 'STORAGE_QUOTA_EXCEEDED'
  // Paylaşım
  | 'SHARING_ENCRYPT_FAILED'
  | 'SHARING_DECRYPT_FAILED'
  | 'SHARING_PAYLOAD_EXPIRED'
  | 'SHARING_PROTOCOL_MISMATCH'
  // İçe/Dışa Aktarım
  | 'IMPORT_PARSE_FAILED'
  | 'IMPORT_FILE_TOO_LARGE'
  | 'EXPORT_BUILD_FAILED'
  // Senkronizasyon
  | 'SYNC_NETWORK_ERROR'
  | 'SYNC_CONFLICT'
  | 'SYNC_RELAY_INVALID'
  // Eklenti Köprüsü
  | 'BRIDGE_CONNECTION_FAILED'
  | 'BRIDGE_HMAC_MISMATCH'
  | 'BRIDGE_NONCE_REPLAY'
  // Genel
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR';

// ─── Ciddiyet Seviyeleri ─────────────────────────────────────────

export type AegisErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// ─── Hata Bağlamı ────────────────────────────────────────────────

export interface AegisErrorContext {
  /** Hatanın kaynağı olan servis/modül adı */
  source?: string;
  /** İşlem adı (örn: 'encryptEntries', 'unlockVault') */
  operation?: string;
  /** Ek debugging bilgisi */
  metadata?: Record<string, unknown>;
}

// ─── Ana Sınıf ──────────────────────────────────────────────────

export class AegisError extends Error {
  /** Makine tarafından okunabilir hata kodu */
  readonly code: AegisErrorCode;
  /** Hata ciddiyet seviyesi */
  readonly severity: AegisErrorSeverity;
  /** Opsiyonel bağlam bilgisi */
  readonly context?: AegisErrorContext;
  /** Orijinal hata (zincir) */
  readonly cause?: Error;
  /** Otomatik oluşturulan zaman damgası */
  readonly timestamp: string;
  /** Rate-limit durumlarında yeniden deneme süresi (ms) */
  readonly retryAfterMs?: number;

  constructor(
    code: AegisErrorCode,
    message: string,
    options?: {
      severity?: AegisErrorSeverity;
      context?: AegisErrorContext;
      cause?: Error;
      retryAfterMs?: number;
    }
  ) {
    super(message);
    this.name = 'AegisError';
    this.code = code;
    this.severity = options?.severity ?? AegisError.defaultSeverity(code);
    this.context = options?.context;
    this.cause = options?.cause;
    this.timestamp = new Date().toISOString();
    this.retryAfterMs = options?.retryAfterMs;

    // V8 stack trace düzeltmesi
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AegisError);
    }
  }

  // ─── Fabrika Metotları ──────────────────────────────────────────

  /** Kimlik doğrulama hatası */
  static authFailed(message: string, cause?: Error): AegisError {
    return new AegisError('AUTH_INVALID_PASSWORD', message, {
      severity: 'high',
      context: { source: 'VaultAuthService', operation: 'authenticate' },
      cause,
    });
  }

  /** Rate-limit hatası */
  static rateLimited(retryAfterMs: number): AegisError {
    return new AegisError(
      'AUTH_RATE_LIMITED',
      `Too many attempts. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`,
      {
        severity: 'medium',
        context: { source: 'VaultAuthService', operation: 'enforceRateLimit' },
        retryAfterMs,
      }
    );
  }

  /** Şifreleme hatası */
  static encryptionFailed(operation: string, cause?: Error): AegisError {
    return new AegisError('CRYPTO_ENCRYPTION_FAILED', `Encryption failed: ${operation}`, {
      severity: 'critical',
      context: { source: 'VaultCryptoService', operation },
      cause,
    });
  }

  /** Çözme hatası */
  static decryptionFailed(operation: string, cause?: Error): AegisError {
    return new AegisError('CRYPTO_DECRYPTION_FAILED', `Decryption failed: ${operation}`, {
      severity: 'critical',
      context: { source: 'VaultCryptoService', operation },
      cause,
    });
  }

  /** Paylaşım hatası */
  static sharingFailed(operation: string, message: string, cause?: Error): AegisError {
    return new AegisError('SHARING_ENCRYPT_FAILED', message, {
      severity: 'high',
      context: { source: 'SharingTransportService', operation },
      cause,
    });
  }

  /** Doğrulama hatası */
  static validationFailed(message: string, source?: string): AegisError {
    return new AegisError('VALIDATION_FAILED', message, {
      severity: 'low',
      context: { source: source ?? 'Validation' },
    });
  }

  /** Bilinmeyen hatayı sarmalamak */
  static wrap(error: unknown, context?: AegisErrorContext): AegisError {
    if (error instanceof AegisError) return error;
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    return new AegisError('UNKNOWN_ERROR', message, {
      severity: 'medium',
      context,
      cause,
    });
  }

  // ─── Yardımcı Metotlar ─────────────────────────────────────────

  /** Kullanıcıya gösterilebilir mesaj üretir (hassas bilgi olmadan) */
  toUserMessage(): string {
    // Güvenlik: İç hata ayrıntılarını kullanıcıya gösterme
    const safeMessages: Partial<Record<AegisErrorCode, string>> = {
      AUTH_INVALID_PASSWORD: 'Invalid password. Please try again.',
      AUTH_RATE_LIMITED: 'Too many attempts. Please wait and try again.',
      AUTH_VAULT_LOCKED: 'Vault is locked. Please unlock first.',
      CRYPTO_DECRYPTION_FAILED: 'Failed to decrypt data.',
      SHARING_PAYLOAD_EXPIRED: 'This sharing link has expired.',
      SHARING_PROTOCOL_MISMATCH: 'Unsupported sharing protocol version.',
      IMPORT_FILE_TOO_LARGE: 'Import file exceeds the size limit.',
      VALIDATION_FAILED: this.message,
    };
    return safeMessages[this.code] ?? 'An unexpected error occurred. Please try again.';
  }

  /** Debugging için yapılandırılmış JSON çıktısı */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      retryAfterMs: this.retryAfterMs,
      cause: this.cause?.message,
    };
  }

  /** AegisError olup olmadığını kontrol eder (type guard) */
  static isAegisError(error: unknown): error is AegisError {
    return error instanceof AegisError;
  }

  // ─── Varsayılan Ciddiyet ─────────────────────────────────────────

  private static defaultSeverity(code: AegisErrorCode): AegisErrorSeverity {
    if (code.startsWith('CRYPTO_')) return 'critical';
    if (code.startsWith('AUTH_')) return 'high';
    if (code.startsWith('SHARING_')) return 'high';
    if (code.startsWith('SYNC_')) return 'medium';
    if (code.startsWith('BRIDGE_')) return 'medium';
    if (code.startsWith('STORAGE_')) return 'high';
    if (code.startsWith('IMPORT_') || code.startsWith('EXPORT_')) return 'medium';
    return 'low';
  }
}
