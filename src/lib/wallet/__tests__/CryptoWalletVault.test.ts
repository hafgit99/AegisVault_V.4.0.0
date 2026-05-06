import { describe, expect, it } from 'vitest';
import {
  CRYPTO_WALLET_CATEGORY,
  CryptoWalletVault,
  type CryptoWalletChain,
} from '../CryptoWalletVault';
import type { VaultEntry } from '../../../vaultService';

describe('CryptoWalletVault', () => {
  it('exposes stable crypto wallet constants and chain labels', () => {
    expect(CRYPTO_WALLET_CATEGORY).toBe('CryptoWallet');
    expect(CryptoWalletVault.category).toBe('CryptoWallet');
    expect(CryptoWalletVault.watchOnlySentinel).toBe('AEGIS_WATCH_ONLY_NO_PRIVATE_MATERIAL');
    expect(CryptoWalletVault.getChainLabel('bitcoin')).toBe('Bitcoin');
    expect(CryptoWalletVault.getChainLabel('ethereum')).toBe('Ethereum / EVM');
    expect(CryptoWalletVault.getChainLabel('solana')).toBe('Solana');
    expect(CryptoWalletVault.getChainLabel('tron')).toBe('Tron');
    expect(CryptoWalletVault.getChainLabel('litecoin')).toBe('Litecoin');
    expect(CryptoWalletVault.getChainLabel('other')).toBe('Other');
    expect(CryptoWalletVault.getChainLabel('unknown' as CryptoWalletChain)).toBe('Other');
  });

  it('creates a watch-only vault entry without storing private material', () => {
    const entry = CryptoWalletVault.fromDraft({
      name: '  ETH Watch  ',
      chain: 'ethereum',
      publicAddress: '  0x742d35Cc6634C0532925a3b844Bc454e4438f44e  ',
      custodyMode: 'watch_only',
      secretKind: 'private_key',
      secretMaterial: 'should not be stored',
      derivationPath: '   ',
      lastKnownBalance: ' 1.25 ETH ',
      notes: ' Treasury public address ',
    });

    expect(entry.title).toBe('ETH Watch');
    expect(entry.category).toBe(CRYPTO_WALLET_CATEGORY);
    expect(entry.pass).toBe(CryptoWalletVault.watchOnlySentinel);
    expect(entry.username).toBe('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    expect(entry.website).toBe('Ethereum / EVM');
    expect(entry.tags).toEqual(['crypto', 'wallet', 'ethereum', 'watch_only']);

    const parsed = JSON.parse(entry.notes || '{}');
    expect(parsed.schema).toBe('aegis.crypto_wallet.v1');
    expect(parsed.name).toBe('ETH Watch');
    expect(parsed.publicAddress).toBe('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    expect(parsed.secretKind).toBe('none');
    expect(parsed.lastKnownBalance).toBe('1.25 ETH');
    expect(parsed.notes).toBe('Treasury public address');
    expect(parsed.derivationPath).toBeUndefined();
  });

  it('creates a vault-secret entry and maps it back to the wallet domain model', () => {
    const draft = CryptoWalletVault.fromDraft({
      name: ' BTC Cold ',
      chain: 'bitcoin',
      publicAddress: ' bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080 ',
      custodyMode: 'vault_secret',
      secretKind: 'seed_phrase',
      secretMaterial: ' abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about ',
      derivationPath: " m/84'/0'/0'/0/0 ",
      lastKnownBalance: '',
      notes: '',
    });

    const record = CryptoWalletVault.toRecord({
      id: 42,
      title: draft.title,
      username: draft.username,
      pass: draft.pass,
      category: draft.category,
      website: draft.website,
      notes: draft.notes,
      updated_at: '2026-05-06T00:00:00.000Z',
    } as VaultEntry);

    expect(record).toMatchObject({
      walletId: 42,
      name: 'BTC Cold',
      chain: 'bitcoin',
      networkLabel: 'Bitcoin',
      publicAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080',
      custodyMode: 'vault_secret',
      secretKind: 'seed_phrase',
      derivationPath: "m/84'/0'/0'/0/0",
    });
    expect(draft.title).toBe('BTC Cold');
    expect(draft.username).toBe('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080');
    expect(draft.pass).toBe(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    );
    expect(record?.lastKnownBalance).toBeUndefined();
    expect(record?.notes).toBeUndefined();
  });

  it('defaults vault-secret drafts to seed phrase when no secret kind is selected', () => {
    const entry = CryptoWalletVault.fromDraft({
      name: 'SOL Cold',
      chain: 'solana',
      publicAddress: '81H1rKZHjpSsnr6Epumw9XVTfqAnqSHcTKm7D3VsEd74',
      custodyMode: 'vault_secret',
      secretMaterial: 'solana-private-key',
    });

    expect(entry.pass).toBe('solana-private-key');
    expect(JSON.parse(entry.notes || '{}').secretKind).toBe('seed_phrase');
  });

  it('falls back to watch-only when vault-secret mode has blank secret material', () => {
    const entry = CryptoWalletVault.fromDraft({
      name: 'Blank Secret',
      chain: 'tron',
      publicAddress: 'TQBz3q8Ddjap3K8QdFQHtJKBxbvXMCi62E',
      custodyMode: 'vault_secret',
      secretMaterial: '   ',
    });

    expect(entry.pass).toBe(CryptoWalletVault.watchOnlySentinel);
    expect(JSON.parse(entry.notes || '{}').custodyMode).toBe('vault_secret');
  });

  it('ignores non-wallet entries and tolerates legacy crypto wallet records', () => {
    expect(
      CryptoWalletVault.toRecord({
        id: 1,
        title: 'Not a wallet',
        username: '',
        category: 'General',
        website: '',
        updated_at: '2026-05-06T00:00:00.000Z',
      } as VaultEntry)
    ).toBeNull();

    const legacy = CryptoWalletVault.toRecord({
      id: 2,
      title: 'Legacy Wallet',
      username: 'legacy-address',
      pass: CryptoWalletVault.watchOnlySentinel,
      category: CRYPTO_WALLET_CATEGORY,
      website: 'Legacy Network',
      notes: 'not-json',
      updated_at: '2026-05-06T00:00:00.000Z',
    } as VaultEntry);

    expect(legacy).toMatchObject({
      walletId: 2,
      name: 'Legacy Wallet',
      chain: 'other',
      networkLabel: 'Legacy Network',
      publicAddress: 'legacy-address',
      custodyMode: 'watch_only',
      secretKind: 'none',
      createdAt: '2026-05-06T00:00:00.000Z',
      updatedAt: '2026-05-06T00:00:00.000Z',
    });
  });

  it('uses safe defaults for sparse legacy wallet records', () => {
    const legacy = CryptoWalletVault.toRecord({
      id: 3,
      title: '',
      username: '',
      pass: 'legacy-private-key',
      category: CRYPTO_WALLET_CATEGORY,
      website: '',
      notes: '',
      updated_at: '2026-05-06T01:00:00.000Z',
    } as VaultEntry);

    expect(legacy).toEqual({
      walletId: 3,
      name: 'Crypto Vault',
      chain: 'other',
      networkLabel: 'Other',
      publicAddress: '',
      custodyMode: 'vault_secret',
      secretKind: 'private_key',
      createdAt: '2026-05-06T01:00:00.000Z',
      updatedAt: '2026-05-06T01:00:00.000Z',
    });
  });

  it.each([
    ['wrong schema', { schema: 'aegis.crypto_wallet.v0', name: 'Bad', chain: 'ethereum', publicAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' }],
    ['missing name', { schema: 'aegis.crypto_wallet.v1', chain: 'ethereum', publicAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' }],
    ['missing chain', { schema: 'aegis.crypto_wallet.v1', name: 'Bad', publicAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' }],
    ['missing public address', { schema: 'aegis.crypto_wallet.v1', name: 'Bad', chain: 'ethereum' }],
  ])('rejects malformed wallet payloads and keeps legacy fallback for %s', (_caseName, notes) => {
    const record = CryptoWalletVault.toRecord({
      id: 4,
      title: 'Fallback Wallet',
      username: 'fallback-address',
      pass: CryptoWalletVault.watchOnlySentinel,
      category: CRYPTO_WALLET_CATEGORY,
      website: 'Fallback Network',
      notes: JSON.stringify(notes),
      updated_at: '2026-05-06T02:00:00.000Z',
    } as VaultEntry);

    expect(record).toEqual({
      walletId: 4,
      name: 'Fallback Wallet',
      chain: 'other',
      networkLabel: 'Fallback Network',
      publicAddress: 'fallback-address',
      custodyMode: 'watch_only',
      secretKind: 'none',
      createdAt: '2026-05-06T02:00:00.000Z',
      updatedAt: '2026-05-06T02:00:00.000Z',
    });
  });

  it('maps payload records with default network label and secret kind fallbacks', () => {
    const watchOnlyRecord = CryptoWalletVault.toRecord({
      id: 5,
      title: 'Ignored',
      username: 'ignored',
      pass: 'ignored',
      category: CRYPTO_WALLET_CATEGORY,
      website: 'ignored',
      notes: JSON.stringify({
        schema: 'aegis.crypto_wallet.v1',
        name: 'Payload Watch',
        chain: 'solana',
        publicAddress: '81H1rKZHjpSsnr6Epumw9XVTfqAnqSHcTKm7D3VsEd74',
        custodyMode: 'watch_only',
        createdAt: '2026-05-06T03:00:00.000Z',
        updatedAt: '2026-05-06T04:00:00.000Z',
      }),
      updated_at: 'ignored',
    } as VaultEntry);

    expect(watchOnlyRecord).toEqual({
      walletId: 5,
      name: 'Payload Watch',
      chain: 'solana',
      networkLabel: 'Solana',
      publicAddress: '81H1rKZHjpSsnr6Epumw9XVTfqAnqSHcTKm7D3VsEd74',
      derivationPath: undefined,
      custodyMode: 'watch_only',
      secretKind: 'none',
      lastKnownBalance: undefined,
      lastCheckedAt: undefined,
      notes: undefined,
      createdAt: '2026-05-06T03:00:00.000Z',
      updatedAt: '2026-05-06T04:00:00.000Z',
    });

    const secretRecord = CryptoWalletVault.toRecord({
      id: 6,
      category: CRYPTO_WALLET_CATEGORY,
      notes: JSON.stringify({
        schema: 'aegis.crypto_wallet.v1',
        name: 'Payload Secret',
        chain: 'other',
        networkLabel: '',
        publicAddress: 'custom-address-123',
        custodyMode: 'vault_secret',
        lastKnownBalance: '0.5 TOKEN',
        lastCheckedAt: '2026-05-06T05:00:00.000Z',
        notes: 'manual balance only',
        createdAt: '2026-05-06T03:00:00.000Z',
        updatedAt: '2026-05-06T04:00:00.000Z',
      }),
      updated_at: 'ignored',
    } as VaultEntry);

    expect(secretRecord).toMatchObject({
      walletId: 6,
      name: 'Payload Secret',
      chain: 'other',
      networkLabel: 'Other',
      publicAddress: 'custom-address-123',
      custodyMode: 'vault_secret',
      secretKind: 'seed_phrase',
      lastKnownBalance: '0.5 TOKEN',
      lastCheckedAt: '2026-05-06T05:00:00.000Z',
      notes: 'manual balance only',
    });
  });

  it.each<[CryptoWalletChain, string, boolean]>([
    ['ethereum', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', true],
    ['ethereum', '0xINVALID', false],
    ['ethereum', 'x0x742d35Cc6634C0532925a3b844Bc454e4438f44e', false],
    ['ethereum', '0x742d35Cc6634C0532925a3b844Bc454e4438f44ez', false],
    ['bitcoin', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080', true],
    ['bitcoin', 'xbc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080', false],
    ['bitcoin', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080!', false],
    ['solana', '81H1rKZHjpSsnr6Epumw9XVTfqAnqSHcTKm7D3VsEd74', true],
    ['solana', 'x81H1rKZHjpSsnr6Epumw9XVTfqAnqSHcTKm7D3VsEd74', false],
    ['solana', '81H1rKZHjpSsnr6Epumw9XVTfqAnqSHcTKm7D3VsEd74!', false],
    ['tron', 'TQBz3q8Ddjap3K8QdFQHtJKBxbvXMCi62E', true],
    ['tron', 'xTQBz3q8Ddjap3K8QdFQHtJKBxbvXMCi62E', false],
    ['tron', 'TQBz3q8Ddjap3K8QdFQHtJKBxbvXMCi62E!', false],
    ['litecoin', 'LZC3egqj1K9aZ3i42HbsRWK7m1SbUgXmak', true],
    ['litecoin', 'xLZC3egqj1K9aZ3i42HbsRWK7m1SbUgXmak', false],
    ['litecoin', 'LZC3egqj1K9aZ3i42HbsRWK7m1SbUgXmak!', false],
    ['other', 'custom-address', true],
    ['other', ' custom-address ', true],
    ['other', 'short', false],
    ['other', 'abcdefghijkl', true],
    ['other', 'abcdefghijk', false],
    ['other', 'a'.repeat(140), true],
    ['other', 'a'.repeat(141), false],
    ['other', '', false],
    ['other', '   ', false],
  ])('validates %s address "%s" as %s', (chain, address, expected) => {
    expect(CryptoWalletVault.validateAddress(chain, address)).toBe(expected);
  });
});
