import type { VaultEntry } from '../vaultService';
import { BackupService } from './BackupService';
import { toBufferSource } from './crypto-types';
import {
  AEGIS_APP_VERSION,
  AEGIS_QR_SYNC_FORMAT,
  AEGIS_QR_SYNC_PAIRING_FORMAT,
} from '../config/schema-registry';
import {
  SecureAppSettings,
  type QRTransferAuditEvent,
  type QRTransferLedgerRecord,
} from './SecureAppSettings';

const TRANSFER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_EXPIRY_MS = 5 * 60 * 1000;
const DEFAULT_PAIRING_EXPIRY_MS = 10 * 60 * 1000;

export interface QRSyncPackage {
  format: typeof AEGIS_QR_SYNC_FORMAT;
  version: typeof AEGIS_APP_VERSION;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  entryCount: number;
  payload: string;
  protectionMode: 'transfer-code' | 'transfer-code+ecdh';
  senderPublicKey?: string;
  recipientKeyFingerprint?: string;
}

export interface QRSyncReceiverSession {
  format: typeof AEGIS_QR_SYNC_PAIRING_FORMAT;
  publicKey: string;
  privateKey: CryptoKey;
  createdAt: string;
  expiresAt: string;
  fingerprint: string;
}

export interface QRSyncCreateOptions {
  transferCode: string;
  expiresInMs?: number;
  recipientPublicKey?: string;
}

export interface QRSyncParseOptions {
  transferCode: string;
  receiverSession?: QRSyncReceiverSession | null;
}

export interface QRSyncCreateResult {
  rawPackage: string;
  packageInfo: QRSyncPackage;
}

export type QRSyncEntry = Pick<VaultEntry, 'title' | 'username' | 'pass' | 'website' | 'category' | 'tags' | 'passkeyMetadata'>;

type ConsumedPackageMap = Record<string, string>;
type TransferLedgerMap = Record<string, QRTransferLedgerRecord>;

const normalizeTransferCode = (code: string): string =>
  code.toUpperCase().replace(/[^A-Z0-9]/g, '');

const encodeBase64Url = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const decodeBase64Url = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

const randomHex = (byteLength: number): string => {
  const bytes = window.crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const isQRSyncEntry = (entry: unknown): entry is QRSyncEntry => {
  if (!entry || typeof entry !== 'object') return false;
  const candidate = entry as Record<string, unknown>;
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.pass === 'string' &&
    (candidate.username === undefined || typeof candidate.username === 'string') &&
    (candidate.website === undefined || typeof candidate.website === 'string') &&
    (candidate.category === undefined || typeof candidate.category === 'string') &&
    (candidate.tags === undefined || Array.isArray(candidate.tags)) &&
    (candidate.passkeyMetadata === undefined || typeof candidate.passkeyMetadata === 'object')
  );
};

const parsePairingPublicKey = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith(`${AEGIS_QR_SYNC_PAIRING_FORMAT}:`)) {
    return trimmed.slice(`${AEGIS_QR_SYNC_PAIRING_FORMAT}:`.length);
  }
  return trimmed;
};

const auditId = () => randomHex(8);

const readConsumedPackages = (): ConsumedPackageMap => {
  return SecureAppSettings.getQrConsumedPackages();
};

const readTransferLedger = (): TransferLedgerMap => {
  return SecureAppSettings.getQrTransferLedger();
};

const persistTransferLedger = (ledger: TransferLedgerMap) => {
  SecureAppSettings.setQrTransferLedger(ledger);
};

const readTransferAudit = (): QRTransferAuditEvent[] => {
  return SecureAppSettings.getQrTransferAudit();
};

const persistTransferAudit = (events: QRTransferAuditEvent[]) => {
  SecureAppSettings.setQrTransferAudit(events);
};

const persistConsumedPackages = (map: ConsumedPackageMap) => {
  SecureAppSettings.setQrConsumedPackages(map);
};

const cleanupConsumedPackages = (map: ConsumedPackageMap): ConsumedPackageMap => {
  const now = Date.now();
  const next: ConsumedPackageMap = {};
  for (const [sessionId, consumedAt] of Object.entries(map)) {
    if (now - Date.parse(consumedAt) < DEFAULT_PAIRING_EXPIRY_MS * 3) {
      next[sessionId] = consumedAt;
    }
  }
  return next;
};

const cleanupTransferAudit = (events: QRTransferAuditEvent[]): QRTransferAuditEvent[] => {
  const maxEvents = 120;
  return events
    .slice()
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, maxEvents);
};

const cleanupTransferLedger = (ledger: TransferLedgerMap): TransferLedgerMap => {
  const now = Date.now();
  const next: TransferLedgerMap = {};
  for (const [sessionId, record] of Object.entries(ledger)) {
    const expiry = Date.parse(record.expiresAt);
    const keepWindowMs = DEFAULT_PAIRING_EXPIRY_MS * 6;
    const shouldKeep = Number.isNaN(expiry) || now - expiry < keepWindowMs;
    if (shouldKeep) {
      next[sessionId] = { ...record };
    }
  }
  return next;
};

const persistAuditEvent = (event: Omit<QRTransferAuditEvent, 'id'>) => {
  const cleaned = cleanupTransferAudit(readTransferAudit());
  cleaned.unshift({
    id: auditId(),
    ...event,
  });
  persistTransferAudit(cleaned);
};

const setTransferLedgerRecord = (record: QRTransferLedgerRecord) => {
  const cleaned = cleanupTransferLedger(readTransferLedger());
  cleaned[record.sessionId] = { ...record };
  persistTransferLedger(cleaned);
};

const getTransferLedgerRecord = (sessionId: string): QRTransferLedgerRecord | null => {
  const cleaned = cleanupTransferLedger(readTransferLedger());
  persistTransferLedger(cleaned);
  return cleaned[sessionId] ? { ...cleaned[sessionId] } : null;
};

const markPackageConsumed = (sessionId: string) => {
  const cleaned = cleanupConsumedPackages(readConsumedPackages());
  cleaned[sessionId] = new Date().toISOString();
  persistConsumedPackages(cleaned);
  const existing = getTransferLedgerRecord(sessionId);
  if (existing) {
    setTransferLedgerRecord({
      ...existing,
      status: 'consumed',
      consumedAt: cleaned[sessionId],
    });
  }
};

const hasPackageBeenConsumed = (sessionId: string): boolean => {
  const cleaned = cleanupConsumedPackages(readConsumedPackages());
  persistConsumedPackages(cleaned);
  return Boolean(cleaned[sessionId]);
};

const isPackageRevoked = (sessionId: string): boolean => {
  const record = getTransferLedgerRecord(sessionId);
  return record?.status === 'revoked';
};

const generateEcdhKeyPair = async (): Promise<CryptoKeyPair> =>
  window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

const exportPublicKey = async (publicKey: CryptoKey): Promise<string> => {
  const raw = await window.crypto.subtle.exportKey('raw', publicKey);
  return encodeBase64Url(raw);
};

const importPublicKey = async (publicKey: string): Promise<CryptoKey> =>
  window.crypto.subtle.importKey(
    'raw',
    toBufferSource(decodeBase64Url(parsePairingPublicKey(publicKey))),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

const deriveSharedSecret = async (privateKey: CryptoKey, peerPublicKey: string): Promise<Uint8Array> => {
  const imported = await importPublicKey(peerPublicKey);
  const bits = await window.crypto.subtle.deriveBits(
    { name: 'ECDH', public: imported },
    privateKey,
    256
  );
  return new Uint8Array(bits);
};

const sha256 = async (payload: Uint8Array): Promise<Uint8Array> => {
  const digest = await window.crypto.subtle.digest('SHA-256', toBufferSource(payload));
  return new Uint8Array(digest);
};

const concatBytes = (...segments: Uint8Array[]): Uint8Array => {
  const total = segments.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of segments) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};

const deriveBackupPassword = async (
  transferCode: string,
  sessionId: string,
  sharedSecret?: Uint8Array
): Promise<string> => {
  const encoder = new TextEncoder();
  const material = concatBytes(
    encoder.encode(normalizeTransferCode(transferCode)),
    encoder.encode(sessionId),
    sharedSecret ?? new Uint8Array()
  );
  const digest = await sha256(material);
  return encodeBase64Url(digest);
};

const fingerprintPublicKey = async (publicKey: string): Promise<string> => {
  const digest = await sha256(decodeBase64Url(parsePairingPublicKey(publicKey)));
  return Array.from(digest.slice(0, 8), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export class QRSyncService {
  static generateTransferCode(groupCount: number = 4, groupLength: number = 4): string {
    const bytes = window.crypto.getRandomValues(new Uint8Array(groupCount * groupLength));
    const chars = Array.from(bytes, (byte) => TRANSFER_CODE_ALPHABET[byte % TRANSFER_CODE_ALPHABET.length]);
    const groups: string[] = [];

    for (let i = 0; i < chars.length; i += groupLength) {
      groups.push(chars.slice(i, i + groupLength).join(''));
    }

    return groups.join('-');
  }

  static async createReceiverSession(expiresInMs: number = DEFAULT_PAIRING_EXPIRY_MS): Promise<QRSyncReceiverSession> {
    await SecureAppSettings.initialize();
    const keyPair = await generateEcdhKeyPair();
    const publicKey = await exportPublicKey(keyPair.publicKey);
    const session: QRSyncReceiverSession = {
      format: AEGIS_QR_SYNC_PAIRING_FORMAT,
      publicKey: `${AEGIS_QR_SYNC_PAIRING_FORMAT}:${publicKey}`,
      privateKey: keyPair.privateKey,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
      fingerprint: await fingerprintPublicKey(publicKey),
    };
    persistAuditEvent({
      type: 'receiver_session_created',
      at: session.createdAt,
      detail: 'Receiver pairing session created for QR import.',
      metadata: {
        fingerprint: session.fingerprint,
      },
    });
    return session;
  }

  static async createPackage(entries: QRSyncEntry[], options: QRSyncCreateOptions | string): Promise<QRSyncCreateResult> {
    await SecureAppSettings.initialize();
    const normalizedOptions: QRSyncCreateOptions = typeof options === 'string' ? { transferCode: options } : options;
    const normalizedCode = normalizeTransferCode(normalizedOptions.transferCode);
    if (normalizedCode.length < 8) {
      throw new Error('QR_SYNC_TRANSFER_CODE_WEAK');
    }

    const sessionId = randomHex(16);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (normalizedOptions.expiresInMs ?? DEFAULT_EXPIRY_MS)).toISOString();
    let protectionMode: QRSyncPackage['protectionMode'] = 'transfer-code';
    let senderPublicKey: string | undefined;
    let recipientKeyFingerprint: string | undefined;
    let sharedSecret: Uint8Array | undefined;

    if (normalizedOptions.recipientPublicKey?.trim()) {
      const senderKeyPair = await generateEcdhKeyPair();
      senderPublicKey = await exportPublicKey(senderKeyPair.publicKey);
      sharedSecret = await deriveSharedSecret(senderKeyPair.privateKey, normalizedOptions.recipientPublicKey);
      protectionMode = 'transfer-code+ecdh';
      recipientKeyFingerprint = await fingerprintPublicKey(normalizedOptions.recipientPublicKey);
    }

    const derivedPassword = await deriveBackupPassword(normalizedCode, sessionId, sharedSecret);
    const encryptedPayload = await BackupService.encryptBackup(entries, derivedPassword);
    const qrPackage: QRSyncPackage = {
      format: AEGIS_QR_SYNC_FORMAT,
      version: AEGIS_APP_VERSION,
      sessionId,
      createdAt,
      expiresAt,
      entryCount: entries.length,
      payload: encryptedPayload,
      protectionMode,
      senderPublicKey,
      recipientKeyFingerprint,
    };

    setTransferLedgerRecord({
      sessionId,
      createdAt,
      expiresAt,
      entryCount: entries.length,
      protectionMode,
      recipientFingerprint: recipientKeyFingerprint,
      status: 'created',
    });
    persistAuditEvent({
      sessionId,
      type: 'package_created',
      at: createdAt,
      detail: 'QR transfer package created.',
      metadata: {
        entryCount: entries.length,
        protectionMode,
        recipientFingerprint: recipientKeyFingerprint,
      },
    });

    return {
      rawPackage: JSON.stringify(qrPackage),
      packageInfo: qrPackage,
    };
  }

  static async parsePackage(rawPackage: string, options: QRSyncParseOptions | string): Promise<QRSyncEntry[]> {
    await SecureAppSettings.initialize();
    const normalizedOptions: QRSyncParseOptions = typeof options === 'string' ? { transferCode: options } : options;
    const normalizedCode = normalizeTransferCode(normalizedOptions.transferCode);
    if (normalizedCode.length < 8) {
      throw new Error('QR_SYNC_TRANSFER_CODE_REQUIRED');
    }

    let qrPackage: QRSyncPackage;
    try {
      qrPackage = JSON.parse(rawPackage) as QRSyncPackage;
    } catch {
      throw new Error('QR_SYNC_INVALID_PACKAGE');
    }

    if (
      qrPackage.format !== AEGIS_QR_SYNC_FORMAT ||
      typeof qrPackage.payload !== 'string' ||
      typeof qrPackage.sessionId !== 'string' ||
      typeof qrPackage.expiresAt !== 'string'
    ) {
      throw new Error('QR_SYNC_UNSUPPORTED_FORMAT');
    }

    if (Date.parse(qrPackage.expiresAt) <= Date.now()) {
      throw new Error('QR_SYNC_PACKAGE_EXPIRED');
    }

    if (hasPackageBeenConsumed(qrPackage.sessionId)) {
      persistAuditEvent({
        sessionId: qrPackage.sessionId,
        type: 'package_rejected',
        at: new Date().toISOString(),
        detail: 'Rejected QR import because the package was already consumed.',
        metadata: {
          reason: 'already_used',
        },
      });
      throw new Error('QR_SYNC_PACKAGE_ALREADY_USED');
    }

    if (isPackageRevoked(qrPackage.sessionId)) {
      persistAuditEvent({
        sessionId: qrPackage.sessionId,
        type: 'package_rejected',
        at: new Date().toISOString(),
        detail: 'Rejected QR import because the package was revoked.',
        metadata: {
          reason: 'revoked',
        },
      });
      throw new Error('QR_SYNC_PACKAGE_REVOKED');
    }

    let sharedSecret: Uint8Array | undefined;
    if (qrPackage.protectionMode === 'transfer-code+ecdh') {
      if (!normalizedOptions.receiverSession) {
        throw new Error('QR_SYNC_PAIRING_REQUIRED');
      }
      if (Date.parse(normalizedOptions.receiverSession.expiresAt) <= Date.now()) {
        throw new Error('QR_SYNC_PAIRING_EXPIRED');
      }
      const receiverPublicKey = parsePairingPublicKey(normalizedOptions.receiverSession.publicKey);
      if (qrPackage.recipientKeyFingerprint) {
        const receiverFingerprint = await fingerprintPublicKey(receiverPublicKey);
        if (receiverFingerprint !== qrPackage.recipientKeyFingerprint) {
          throw new Error('QR_SYNC_PAIRING_MISMATCH');
        }
      }
      if (!qrPackage.senderPublicKey) {
        throw new Error('QR_SYNC_PAIRING_REQUIRED');
      }
      sharedSecret = await deriveSharedSecret(normalizedOptions.receiverSession.privateKey, qrPackage.senderPublicKey);
    }

    const derivedPassword = await deriveBackupPassword(normalizedCode, qrPackage.sessionId, sharedSecret);
    const entries = await BackupService.decryptBackup<QRSyncEntry>(qrPackage.payload, derivedPassword);
    if (!Array.isArray(entries) || !entries.every(isQRSyncEntry)) {
      throw new Error('QR_SYNC_INVALID_PAYLOAD');
    }

    markPackageConsumed(qrPackage.sessionId);
    persistAuditEvent({
      sessionId: qrPackage.sessionId,
      type: 'package_consumed',
      at: new Date().toISOString(),
      detail: 'QR transfer package imported successfully.',
      metadata: {
        protectionMode: qrPackage.protectionMode,
        entryCount: qrPackage.entryCount,
      },
    });
    return entries;
  }

  static listTransferHistory(): QRTransferLedgerRecord[] {
    return Object.values(cleanupTransferLedger(readTransferLedger())).sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
  }

  static listAuditEvents(): QRTransferAuditEvent[] {
    return cleanupTransferAudit(readTransferAudit());
  }

  static revokeTransfer(sessionId: string, reason: string = 'manual_revoke'): boolean {
    const existing = getTransferLedgerRecord(sessionId);
    if (!existing || existing.status !== 'created') {
      return false;
    }

    const revokedAt = new Date().toISOString();
    setTransferLedgerRecord({
      ...existing,
      status: 'revoked',
      revokedAt,
      revokeReason: reason,
    });
    persistAuditEvent({
      sessionId,
      type: 'package_revoked',
      at: revokedAt,
      detail: 'QR transfer package revoked before import.',
      metadata: {
        reason,
      },
    });
    return true;
  }
}
