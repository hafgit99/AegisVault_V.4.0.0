import type { VaultEntry } from '../../vaultService';

export const CRYPTO_WALLET_CATEGORY = 'CryptoWallet';
const WATCH_ONLY_SENTINEL = 'AEGIS_WATCH_ONLY_NO_PRIVATE_MATERIAL';

export type CryptoWalletChain = 'bitcoin' | 'ethereum' | 'solana' | 'tron' | 'litecoin' | 'other';

export type CryptoWalletCustodyMode = 'watch_only' | 'vault_secret';

export interface CryptoWalletRecord {
  walletId: number;
  name: string;
  chain: CryptoWalletChain;
  networkLabel: string;
  publicAddress: string;
  derivationPath?: string;
  custodyMode: CryptoWalletCustodyMode;
  secretKind?: 'seed_phrase' | 'private_key' | 'none';
  lastKnownBalance?: string;
  lastCheckedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

type CryptoWalletPayload = Omit<CryptoWalletRecord, 'walletId'> & {
  schema: 'aegis.crypto_wallet.v1';
};

const chainLabels: Record<CryptoWalletChain, string> = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum / EVM',
  solana: 'Solana',
  tron: 'Tron',
  litecoin: 'Litecoin',
  other: 'Other',
};

const safeJsonParse = (value?: string): CryptoWalletPayload | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<CryptoWalletPayload>;
    if (parsed.schema !== 'aegis.crypto_wallet.v1') return null;
    if (!parsed.publicAddress || !parsed.chain || !parsed.name) return null;
    return parsed as CryptoWalletPayload;
  } catch {
    return null;
  }
};

export class CryptoWalletVault {
  static readonly category = CRYPTO_WALLET_CATEGORY;
  static readonly watchOnlySentinel = WATCH_ONLY_SENTINEL;

  static getChainLabel(chain: CryptoWalletChain): string {
    return chainLabels[chain] || chainLabels.other;
  }

  static toRecord(entry: VaultEntry): CryptoWalletRecord | null {
    if (entry.category !== CRYPTO_WALLET_CATEGORY) return null;

    const payload = safeJsonParse(entry.notes);
    if (!payload) {
      return {
        walletId: entry.id,
        name: entry.title || 'Crypto Vault',
        chain: 'other',
        networkLabel: entry.website || chainLabels.other,
        publicAddress: entry.username || '',
        custodyMode:
          entry.pass && entry.pass !== WATCH_ONLY_SENTINEL ? 'vault_secret' : 'watch_only',
        secretKind: entry.pass && entry.pass !== WATCH_ONLY_SENTINEL ? 'private_key' : 'none',
        createdAt: entry.updated_at,
        updatedAt: entry.updated_at,
      };
    }

    return {
      walletId: entry.id,
      name: payload.name,
      chain: payload.chain,
      networkLabel: payload.networkLabel || chainLabels[payload.chain] || chainLabels.other,
      publicAddress: payload.publicAddress,
      derivationPath: payload.derivationPath,
      custodyMode: payload.custodyMode,
      secretKind:
        payload.secretKind || (payload.custodyMode === 'watch_only' ? 'none' : 'seed_phrase'),
      lastKnownBalance: payload.lastKnownBalance,
      lastCheckedAt: payload.lastCheckedAt,
      notes: payload.notes,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    };
  }

  static fromDraft(draft: {
    name: string;
    chain: CryptoWalletChain;
    publicAddress: string;
    custodyMode: CryptoWalletCustodyMode;
    secretMaterial?: string;
    secretKind?: 'seed_phrase' | 'private_key' | 'none';
    derivationPath?: string;
    lastKnownBalance?: string;
    notes?: string;
  }): Partial<VaultEntry> {
    const now = new Date().toISOString();
    const networkLabel = chainLabels[draft.chain] || chainLabels.other;
    const secretMaterial =
      draft.custodyMode === 'vault_secret' && draft.secretMaterial?.trim()
        ? draft.secretMaterial.trim()
        : WATCH_ONLY_SENTINEL;

    const payload: CryptoWalletPayload = {
      schema: 'aegis.crypto_wallet.v1',
      name: draft.name.trim(),
      chain: draft.chain,
      networkLabel,
      publicAddress: draft.publicAddress.trim(),
      derivationPath: draft.derivationPath?.trim() || undefined,
      custodyMode: draft.custodyMode,
      secretKind: draft.custodyMode === 'watch_only' ? 'none' : draft.secretKind || 'seed_phrase',
      lastKnownBalance: draft.lastKnownBalance?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    return {
      title: draft.name.trim(),
      username: draft.publicAddress.trim(),
      website: networkLabel,
      category: CRYPTO_WALLET_CATEGORY,
      pass: secretMaterial,
      notes: JSON.stringify(payload),
      tags: ['crypto', 'wallet', draft.chain, draft.custodyMode],
    };
  }

  static validateAddress(chain: CryptoWalletChain, address: string): boolean {
    const value = address.trim();
    if (!value) return false;

    // Extended public keys are Bitcoin-family watch-only material.
    if (CryptoWalletVault.isExtendedPublicKey(value)) {
      return chain === 'bitcoin' || chain === 'other';
    }

    switch (chain) {
      case 'bitcoin':
        return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/.test(value);
      case 'ethereum':
        return /^0x[a-fA-F0-9]{40}$/.test(value);
      case 'solana':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
      case 'tron':
        return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);
      case 'litecoin':
        return /^(ltc1|[LM3])[a-zA-HJ-NP-Z0-9]{25,90}$/.test(value);
      default:
        return value.length >= 12 && value.length <= 140;
    }
  }

  /** Detect xpub / ypub / zpub extended public key formats (BIP-32/49/84). */
  static isExtendedPublicKey(address: string): boolean {
    const v = address.trim();
    return /^(xpub|ypub|zpub|tpub|upub|vpub)[1-9A-HJ-NP-Za-km-z]{79,120}$/.test(v);
  }

  /** Return the extended key type label if applicable. */
  static getExtendedKeyType(address: string): 'xpub' | 'ypub' | 'zpub' | null {
    const v = address.trim().toLowerCase();
    if (v.startsWith('xpub')) return 'xpub';
    if (v.startsWith('ypub')) return 'ypub';
    if (v.startsWith('zpub')) return 'zpub';
    return null;
  }

  /** Auto-detect the most likely chain from an address or extended key. */
  static detectChainFromAddress(address: string): CryptoWalletChain | null {
    const v = address.trim();
    if (!v) return null;

    // Extended public keys → Bitcoin family
    if (/^(xpub|ypub|zpub|tpub|upub|vpub)/i.test(v)) return 'bitcoin';

    // Bitcoin native segwit / legacy
    if (/^(bc1)[a-zA-HJ-NP-Z0-9]{25,90}$/.test(v)) return 'bitcoin';
    if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(v)) return 'bitcoin';

    // Ethereum / EVM
    if (/^0x[a-fA-F0-9]{40}$/.test(v)) return 'ethereum';

    // Tron
    if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(v)) return 'tron';

    // Litecoin
    if (/^(ltc1|[LM3])[a-zA-HJ-NP-Z0-9]{25,90}$/.test(v)) return 'litecoin';

    // Solana (base58, 32-44 chars, no 0/O/I/l)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)) return 'solana';

    return null;
  }

  /** Check if the entered address likely belongs to a different chain than selected. */
  static getChainMismatchInfo(
    selectedChain: CryptoWalletChain,
    address: string
  ): { mismatch: boolean; detectedChain: CryptoWalletChain | null } {
    const detected = CryptoWalletVault.detectChainFromAddress(address);
    if (!detected || selectedChain === detected)
      return { mismatch: false, detectedChain: detected };
    if (selectedChain === 'other') return { mismatch: false, detectedChain: detected };
    return { mismatch: true, detectedChain: detected };
  }

  /** Return a human-readable address format hint per chain. */
  static getAddressFormatHint(chain: CryptoWalletChain): string {
    switch (chain) {
      case 'bitcoin':
        return 'bc1... / 1... / 3... / xpub... / ypub... / zpub...';
      case 'ethereum':
        return '0x... (40 hex)';
      case 'solana':
        return 'Base58 (32–44 chars)';
      case 'tron':
        return 'T... (34 chars)';
      case 'litecoin':
        return 'ltc1... / L... / M... / 3...';
      default:
        return '12–140 chars';
    }
  }
}
