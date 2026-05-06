// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EntryForm } from '../EntryForm';
import { CryptoWalletVault } from '../../../lib/wallet/CryptoWalletVault';

const handleCreateEntry = vi.fn();

vi.mock('../../../contexts/VaultContext', () => ({
  useVault: () => ({
    handleCreateEntry,
  }),
}));

vi.mock('../../../vaultService', () => ({
  vaultService: {
    decryptHistory: vi.fn().mockResolvedValue([]),
    deleteAttachment: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../lib/VaultManager', () => ({
  VaultManager: {
    getActiveProfile: () => ({ id: 'default', name: 'Default' }),
  },
}));

vi.mock('../../../lib/TotpVaultPolicy', () => ({
  TotpVaultPolicy: {
    getMode: () => 'same_vault',
    isTwoFactorVault: () => false,
  },
}));

vi.mock('../../../lib/SharedSpaceService', () => ({
  SharedSpaceService: {
    listSpaces: () => [],
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

describe('EntryForm crypto wallet integration', () => {
  beforeEach(() => {
    handleCreateEntry.mockReset();
    handleCreateEntry.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows crypto wallet fields when Crypto Wallet category is selected', () => {
    const { container } = render(<EntryForm onClose={vi.fn()} />);

    const categorySelect = container.querySelector('select.entry-field') as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: CryptoWalletVault.category } });

    expect(screen.getByText('cryptoVaultKicker')).toBeTruthy();
    expect(screen.getByPlaceholderText('cryptoWalletAddressPlaceholder')).toBeTruthy();
    expect(screen.getByText('cryptoWalletWatchOnly')).toBeTruthy();
    expect(screen.getByText('cryptoWalletWatchOnlyDefaultHint')).toBeTruthy();
    expect(screen.queryByPlaceholderText('usernameEmailPlaceholder')).toBeNull();
  });

  it('submits a watch-only crypto wallet through the wallet domain mapper', async () => {
    const onClose = vi.fn();
    const { container } = render(<EntryForm onClose={onClose} />);

    fireEvent.change(container.querySelector('select.entry-field') as HTMLSelectElement, {
      target: { value: CryptoWalletVault.category },
    });

    fireEvent.change(screen.getByPlaceholderText('cryptoWalletNamePlaceholder'), {
      target: { value: 'ETH Watch' },
    });
    fireEvent.change(screen.getByPlaceholderText('cryptoWalletAddressPlaceholder'), {
      target: { value: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
    });

    expect(screen.getByText('cryptoWalletAddressValid')).toBeTruthy();

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => expect(handleCreateEntry).toHaveBeenCalledTimes(1));

    const [payload, attachments] = handleCreateEntry.mock.calls[0];
    expect(payload.category).toBe(CryptoWalletVault.category);
    expect(payload.pass).toBe(CryptoWalletVault.watchOnlySentinel);
    expect(payload.username).toBe('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    expect(JSON.parse(payload.notes).custodyMode).toBe('watch_only');
    expect(attachments).toEqual([]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('requires secret material when vault-secret mode is selected', async () => {
    const { toast } = await import('react-toastify');
    const { container } = render(<EntryForm onClose={vi.fn()} />);

    fireEvent.change(container.querySelector('select.entry-field') as HTMLSelectElement, {
      target: { value: CryptoWalletVault.category },
    });
    fireEvent.change(screen.getByPlaceholderText('cryptoWalletNamePlaceholder'), {
      target: { value: 'ETH Secret' },
    });
    fireEvent.change(screen.getByPlaceholderText('cryptoWalletAddressPlaceholder'), {
      target: { value: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
    });

    const custodySelects = container.querySelectorAll('select.entry-field');
    fireEvent.change(custodySelects[2] as HTMLSelectElement, {
      target: { value: 'vault_secret' },
    });
    expect(screen.getByText('cryptoWalletSecretRiskNotice')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('cryptoWalletSecretPlaceholder'), {
      target: { value: '   ' },
    });

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('cryptoWalletSecretRequired');
    });
    expect(handleCreateEntry).not.toHaveBeenCalled();
  });
});
