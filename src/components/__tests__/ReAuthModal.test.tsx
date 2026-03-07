// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { ReAuthModal } from '../ReAuthModal';
import { vaultService } from '../../vaultService';

// Mock dependecies
vi.mock('../../vaultService', () => ({
  vaultService: {
    verifyCurrentPassword: vi.fn(),
  }
}));

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  }
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

describe('ReAuthModal Security Flow (P1-3)', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly and traps focus via aria properties', () => {
    render(
      <ReAuthModal onSuccess={mockOnSuccess} onCancel={mockOnCancel} actionName="Export Data" />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('Re-Authentication Required')).toBeDefined();
  });

  it('submits form and calls onSuccess when password is correct', async () => {
    // Mock the vault service to approve the password
    vi.mocked(vaultService.verifyCurrentPassword).mockResolvedValue(true);

    render(
      <ReAuthModal onSuccess={mockOnSuccess} onCancel={mockOnCancel} actionName="Export" />
    );

    const input = screen.getByLabelText(/Master Password/i);
    const button = screen.getByRole('button', { name: /Verify/i });

    fireEvent.change(input, { target: { value: 'correct_master_pass' } });
    fireEvent.click(button);

    // Should call the mock API
    await waitFor(() => {
      expect(vaultService.verifyCurrentPassword).toHaveBeenCalledWith('correct_master_pass');
    });

    // Should call the success callback
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('shows error toast and does not call onSuccess when password is wrong', async () => {
    // Mock vault service rejecting the password
    vi.mocked(vaultService.verifyCurrentPassword).mockResolvedValue(false);
    const { toast } = await import('react-toastify');

    render(
      <ReAuthModal onSuccess={mockOnSuccess} onCancel={mockOnCancel} actionName="Export" />
    );

    const input = screen.getByLabelText(/Master Password/i);
    const button = screen.getByRole('button', { name: /Verify/i });

    fireEvent.change(input, { target: { value: 'wrong_pass' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(vaultService.verifyCurrentPassword).toHaveBeenCalledWith('wrong_pass');
    });

    // Should NOT call the success callback
    expect(mockOnSuccess).not.toHaveBeenCalled();
    // Should show error toast "invalidCredentials"
    expect(toast.error).toHaveBeenCalledWith('invalidCredentials');
  });

  it('closes on Escape key or Cancel click', async () => {
    render(
      <ReAuthModal onSuccess={mockOnSuccess} onCancel={mockOnCancel} actionName="Export" />
    );

    // Simulate clicking close logic
    const closeButton = screen.getAllByLabelText(/close/i)[0];
    fireEvent.click(closeButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    mockOnCancel.mockClear(); // Reset for next step

    // Simulate Escape key
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
