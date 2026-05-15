import { useState, useEffect, useCallback } from 'react';
import { vaultService } from '../vaultService';
import {
  Shield,
  Lock,
  KeyRound,
  ChevronRight,
  FileDown,
  Fingerprint,
  Globe,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import {
  authenticatePasskeyWithPRF,
  registerPasskeyWithPRF,
  encryptWithPRF,
  decryptWithPRF,
} from '../lib/webAuthn';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { VaultManager, type VaultProfile } from '../lib/VaultManager';
import { WipeConfirmationModal } from './WipeConfirmationModal';
import { PasskeyBindingService } from '../lib/PasskeyBindingService';
import { SecureAppSettings } from '../lib/SecureAppSettings';

const PASSKEY_ROTATION_DAYS = 90;

type WindowWithElectronLanguageBridge = Window &
  typeof globalThis & {
    aegisElectron?: {
      setUiLanguage?: (language: string) => Promise<unknown>;
    };
  };

const getSafePostMessageTarget = () => {
  if (typeof window === 'undefined') return '*';
  const origin = window.location.origin;
  if (!origin || origin === 'null' || origin.startsWith('file:')) {
    return '*';
  }
  return origin;
};

export function VaultLogin({ onUnlock }: { onUnlock: () => void }) {
  const { t, i18n } = useTranslation();
  const [password, setPassword] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isError, setIsError] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [showSetupSecret, setShowSetupSecret] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [passkeyNeedsRotation, setPasskeyNeedsRotation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Multi-Vault state
  const [vaultProfiles, setVaultProfiles] = useState<VaultProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<VaultProfile | null>(null);
  const [showVaultSelector, setShowVaultSelector] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');
  const [showNewVaultInput, setShowNewVaultInput] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const syncLanguageToDesktop = (language: string) => {
    void (window as WindowWithElectronLanguageBridge).aegisElectron?.setUiLanguage?.(language);
  };

  const getCurrentProfileForPasskey = useCallback(() => {
    const profile = activeProfile || VaultManager.getActiveProfile();
    return {
      profileId: profile?.id || null,
      dbName: profile?.dbName || 'aegis_opfs_vault',
    };
  }, [activeProfile]);

  const clearPasskeyEnrollment = useCallback(
    (notifyKey?: string) => {
      const { profileId, dbName } = getCurrentProfileForPasskey();
      PasskeyBindingService.revokeBinding(profileId, dbName);
      setHasPasskey(false);
      setPasskeyNeedsRotation(false);
      if (notifyKey) toast.info(t(notifyKey));
    },
    [getCurrentProfileForPasskey, t]
  );

  const refreshPasskeyState = useCallback(() => {
    const { profileId, dbName } = getCurrentProfileForPasskey();
    const binding = PasskeyBindingService.getBinding(profileId, dbName);
    setHasPasskey(Boolean(binding));

    const createdAt = binding?.meta?.createdAt;
    if (createdAt) {
      const createdAtMs = new Date(createdAt).getTime();
      const ageDays = Number.isFinite(createdAtMs)
        ? Math.floor((Date.now() - createdAtMs) / (1000 * 60 * 60 * 24))
        : 0;
      setPasskeyNeedsRotation(ageDays >= PASSKEY_ROTATION_DAYS);
    } else {
      setPasskeyNeedsRotation(false);
    }
  }, [getCurrentProfileForPasskey]);

  // 1. Initial Mount: Initialize settings and load profiles
  useEffect(() => {
    void (async () => {
      await SecureAppSettings.initialize();
      await PasskeyBindingService.initialize();
      refreshPasskeyState();
    })();

    const initialProfiles = VaultManager.getProfiles();
    setVaultProfiles(initialProfiles);

    const initialActive = VaultManager.getActiveProfile();
    setActiveProfile(initialActive);

    // Apply theme
    try {
      const savedTheme = SecureAppSettings.getThemeMode();
      if (savedTheme === 'dark' || savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch {
      /* ignore */
    }
  }, []); // Run only once on mount

  // 2. Refresh passkey state when active profile changes
  useEffect(() => {
    refreshPasskeyState();
  }, [activeProfile, refreshPasskeyState]);

  useEffect(() => {
    const activeLanguage = i18n.language.startsWith('tr') ? 'tr' : 'en';
    syncLanguageToDesktop(activeLanguage);
    window.postMessage(
      { type: 'AEGIS_UI_LANGUAGE', language: activeLanguage },
      getSafePostMessageTarget()
    );
  }, [i18n.language]);

  const handleCreateVault = () => {
    if (!newVaultName.trim()) return;
    const newProfile = VaultManager.createProfile(newVaultName);
    setVaultProfiles(VaultManager.getProfiles());
    setNewVaultName('');
    setShowNewVaultInput(false);
    toast.success(t('vaultCreated', `"${newProfile.name}" vault created`));
  };

  const handleSwitchVault = (profile: VaultProfile) => {
    VaultManager.setActiveVaultId(profile.id);
    setActiveProfile(profile);
    setShowVaultSelector(false);
    // Vault DB adını vaultService'e bildir
    vaultService.setVaultDbName(profile.dbName);
    toast.info(t('vaultSwitched', `Switched to "${profile.name}"`));
    setTimeout(() => refreshPasskeyState(), 0);
  };

  const handleDeleteVault = (id: string) => {
    const profile = vaultProfiles.find((p) => p.id === id);
    if (!profile) return;
    if (
      window.confirm(t('confirmDeleteVault', `Delete "${profile.name}"? This cannot be undone.`))
    ) {
      VaultManager.deleteProfile(id);
      const updated = VaultManager.getProfiles();
      setVaultProfiles(updated);
      setActiveProfile(VaultManager.getActiveProfile());
      toast.success(t('vaultDeleted', 'Vault deleted'));
    }
  };

  // Create a fast random hex string for 128-bit key simulation
  const generateSecretKey = () => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const hex = Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setSecretKey(hex);
    setShowSetupSecret(true);
  };

  const handleDownloadKit = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.text('Aegis Vault - Emergency Kit', 20, 20);
    doc.text('STORE THIS SECURELY. NEVER SHARE IT.', 20, 30);
    doc.text(`Your Device Secret Key: ${secretKey}`, 20, 50);
    doc.text('To unlock your vault on a new device, you will need this key', 20, 60);
    doc.text('in addition to your Master Password.', 20, 70);
    doc.save('Aegis_Emergency_Secret_Kit.pdf');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (isSetupMode && !showSetupSecret) {
      generateSecretKey();
      return;
    }
    if (!isSetupMode && !secretKey) {
      setIsError(true);
      setTimeout(() => setIsError(false), 2000);
      return;
    }

    setIsDecrypting(true);
    setIsError(false);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) {
          clearInterval(interval);
          return 90;
        }
        return p + 15;
      });
    }, 200);

    try {
      const activeSecret = secretKey;
      if (!activeSecret) throw new Error('Secret key is required');

      // 🔒 Önce ana kasayı aç (AES anahtarı türetilir)
      const currentDbName = activeProfile?.dbName || 'aegis_opfs_vault';
      await vaultService.initDb(password, activeSecret, currentDbName, isSetupMode);

      // 🔒 Kasa açıldıktan sonra şifreli PIN'leri kontrol et
      const pins = await vaultService.getSecurityPins();

      // Kill PIN kontrolü: Eşleşirse kasayı sessizce sil
      if (pins.killPin && password === pins.killPin) {
        await vaultService.wipeAllData();
        clearInterval(interval);
        toast.error(t('wrongPassOrWipe')); // Stealth: Hata gibi göster
        setIsDecrypting(false);
        setProgress(0);
        setPassword('');
        return;
      }

      // Duress PIN kontrolü: Sahte kasayı aç
      if (pins.duressPin && password === pins.duressPin) {
        // Mevcut bağlantıyı kapat ve sahte kasayı aç
        await vaultService.lock();
        await vaultService.initDb(password, activeSecret, 'aegis_dummy_vault', false);
        clearInterval(interval);
        setProgress(100);
        console.warn(t('dummyVaultLoaded'));
        setTimeout(() => onUnlock(), 600);
        return;
      }

      clearInterval(interval);
      setProgress(100);
      setTimeout(() => onUnlock(), 600);
    } catch (error: unknown) {
      console.error(error);
      clearInterval(interval);
      setIsDecrypting(false);
      setProgress(0);
      setIsError(true);

      const errMsg = error instanceof Error ? error.message : '';
      const retryAfterMs =
        typeof (error as { retryAfterMs?: unknown })?.retryAfterMs === 'number'
          ? Number((error as { retryAfterMs?: number }).retryAfterMs)
          : 0;
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      if (errMsg === 'NO_VAULT_FOUND') {
        toast.warning(
          t('noVaultFound', "No vault found. Please use 'Initialize' to create a new one.")
        );
        setIsSetupMode(true);
      } else if (errMsg === 'RATE_LIMITED') {
        toast.error(
          t('authRateLimited', `Too many attempts. Try again in ${retryAfterSeconds} seconds.`)
        );
      } else if (errMsg.includes('Invalid credentials')) {
        toast.error(t('wrongPassOrWipe'));
      } else if (errMsg.includes('Invalid device secret key')) {
        toast.error(t('invalidDeviceKey'));
      } else if (errMsg.includes('VAULT_ALREADY_EXISTS')) {
        toast.warning(t('vaultAlreadyExists'));
      } else {
        toast.error(t('accessDenied'));
      }

      setTimeout(() => setIsError(false), 2000);
    }
  };

  const handleWipe = async () => {
    await vaultService.wipeAllData();
    window.location.reload();
  };

  const handlePasskeyAction = async () => {
    setIsError(false);

    if (hasPasskey) {
      // Authentication Flow
      const { profileId, dbName } = getCurrentProfileForPasskey();
      await PasskeyBindingService.initialize();
      const binding = PasskeyBindingService.getBinding(profileId, dbName);
      if (!binding) {
        clearPasskeyEnrollment('passkeyBindingInvalid');
        return;
      }
      const policyViolations = PasskeyBindingService.getPolicyViolations(binding);
      if (policyViolations.includes('PASSKEY_REVOKED')) {
        clearPasskeyEnrollment('passkeyRevokedPolicyBlocked');
        return;
      }
      if (policyViolations.includes('PASSKEY_RECOVERY_EXPORT_REQUIRED')) {
        toast.warning(t('passkeyRecoveryExportRequired'));
        return;
      }

      try {
        const prfKey = await authenticatePasskeyWithPRF(binding.credentialId, binding.prfSalt);
        if (prfKey) {
          const payloadStr = await decryptWithPRF(prfKey, binding.encryptedPayload);
          const payload = JSON.parse(payloadStr || '{}');
          const payloadPassword = typeof payload.password === 'string' ? payload.password : '';
          const payloadSecretKey = typeof payload.secretKey === 'string' ? payload.secretKey : '';
          const payloadDbName =
            typeof payload.dbName === 'string' && payload.dbName.trim()
              ? payload.dbName
              : activeProfile?.dbName || 'aegis_opfs_vault';
          const payloadProfileId = typeof payload.profileId === 'string' ? payload.profileId : null;

          if (!payloadPassword || !payloadSecretKey) {
            clearPasskeyEnrollment('passkeyPayloadInvalid');
            return;
          }

          if (payloadProfileId) {
            const profile = VaultManager.getProfiles().find((p) => p.id === payloadProfileId);
            if (profile) {
              VaultManager.setActiveVaultId(profile.id);
              setActiveProfile(profile);
              vaultService.setVaultDbName(profile.dbName);
            } else {
              toast.info(t('passkeyProfileNotFound'));
            }
          }

          setPassword(payloadPassword);
          setSecretKey(payloadSecretKey);
          setIsDecrypting(true);

          const interval = setInterval(() => {
            setProgress((p) => {
              if (p >= 90) {
                clearInterval(interval);
                return 90;
              }
              return p + 15;
            });
          }, 200);

          try {
            await vaultService.initDb(payloadPassword, payloadSecretKey, payloadDbName, false);

            PasskeyBindingService.updateLastUsed(payloadProfileId, payloadDbName);

            clearInterval(interval);
            setProgress(100);
            setTimeout(() => onUnlock(), 600);
          } catch (err) {
            console.error(err);
            clearInterval(interval);
            setIsDecrypting(false);
            setProgress(0);
            setIsError(true);
            toast.error(t('passkeyRebindRequired'));
            setTimeout(() => setIsError(false), 2000);
          }
        } else {
          toast.error(t('bioAuthFailed'));
        }
      } catch (e) {
        console.warn('Passkey authentication canceled or failed', e);
        // Fallthrough to standard password entry happens naturally
      }
    } else {
      // Registration Flow
      const currentSecret = isSetupMode ? secretKey : secretKey;
      if (!password || (!isSetupMode && !secretKey)) {
        setIsError(true);
        setTimeout(() => setIsError(false), 2000);
        toast.info(t('enterPassFirst'));
        return;
      }
      try {
        const passkeyRes = await registerPasskeyWithPRF();
        if (passkeyRes) {
          const currentProfile = activeProfile || VaultManager.getActiveProfile();
          const currentDbName = currentProfile?.dbName || 'aegis_opfs_vault';
          await PasskeyBindingService.initialize();
          const existingBinding = PasskeyBindingService.getBinding(
            currentProfile?.id || null,
            currentDbName
          );
          const existingViolations = PasskeyBindingService.getPolicyViolations(existingBinding);
          if (existingViolations.includes('PASSKEY_RECOVERY_EXPORT_REQUIRED')) {
            toast.warning(t('passkeyRecoveryExportRequired'));
            return;
          }
          const payload = JSON.stringify({
            password,
            secretKey: currentSecret,
            profileId: currentProfile?.id || null,
            dbName: currentDbName,
          });
          const encObj = await encryptWithPRF(passkeyRes.prfKey, payload);
          PasskeyBindingService.saveBinding(currentProfile?.id || null, currentDbName, {
            credentialId: passkeyRes.id,
            encryptedPayload: encObj,
            prfSalt: passkeyRes.salt,
            meta: {
              createdAt: new Date().toISOString(),
              lastUsedAt: new Date().toISOString(),
              version: 1,
              profileId: currentProfile?.id || null,
              dbName: currentDbName,
            },
          });
          setHasPasskey(true);
          setPasskeyNeedsRotation(false);
          toast.success(t('bioAdded'));
        } else {
          toast.error(t('bioNotSupported'));
        }
      } catch (e) {
        console.error('Passkey registration failed', e);
        toast.error(t('bioCanceled'));
      }
    }
  };

  const handleRevokePasskey = () => {
    const confirmed = window.confirm(t('passkeyRevokeConfirm'));
    if (!confirmed) return;
    clearPasskeyEnrollment();
    toast.success(t('passkeyRevoked'));
  };

  const handleLanguageToggle = () => {
    const nextLanguage = i18n.language.startsWith('en') ? 'tr' : 'en';
    i18n.changeLanguage(nextLanguage);
    syncLanguageToDesktop(nextLanguage);
    window.postMessage(
      { type: 'AEGIS_UI_LANGUAGE', language: nextLanguage },
      getSafePostMessageTarget()
    );
  };

  return (
    <div className="vault-login-root v5-login-root relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[var(--color-cloud-dancer)] px-4 py-8">
      {/* Language Toggle */}
      <div className="absolute right-4 top-4 z-50">
        <button
          type="button"
          onClick={handleLanguageToggle}
          className="vault-login-control flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-bold shadow-sm backdrop-blur-md"
        >
          <Globe className="w-3.5 h-3.5" />
          {i18n.language.startsWith('en') ? 'EN' : 'TR'}
        </button>
      </div>

      <div className="v5-login-backdrop absolute inset-0 z-0" aria-hidden="true" />

      <main className="v5-login-shell relative z-10 grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl border shadow-2xl lg:grid-cols-[minmax(0,1fr)_448px]">
        <section className="v5-login-intro hidden min-h-[640px] flex-col justify-between p-10 lg:flex xl:p-12">
          <div>
            <div className="v5-login-kicker mb-8 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase">
              <Shield className="h-3.5 w-3.5" />
              {t('v5LoginEyebrow')}
            </div>

            <div className="v5-login-brand-lockup mb-10 flex items-center gap-4">
              <div className="v5-login-brand-icon flex h-16 w-16 items-center justify-center rounded-2xl p-1 shadow-inner">
                <img
                  src="./icon.png"
                  alt="Aegis Logo"
                  className="h-full w-full object-contain drop-shadow-md"
                />
              </div>
              <div>
                <p className="v5-login-brand-eyebrow text-sm font-extrabold uppercase text-white/64">
                  Aegis Vault
                </p>
                <h1 className="v5-login-title mt-1 text-4xl font-bold text-white">
                  {t('v5LoginTitle')}
                </h1>
              </div>
            </div>

            <p className="v5-login-desc max-w-xl text-base">{t('v5LoginDesc')}</p>
          </div>

          <div className="grid gap-3">
            <div className="v5-login-proof-card">
              <Lock className="h-5 w-5" />
              <div>
                <h2>{t('v5LoginProofLocalTitle')}</h2>
                <p>{t('v5LoginProofLocalDesc')}</p>
              </div>
            </div>
            <div className="v5-login-proof-card">
              <KeyRound className="h-5 w-5" />
              <div>
                <h2>{t('v5LoginProofTwoSecretTitle')}</h2>
                <p>{t('v5LoginProofTwoSecretDesc')}</p>
              </div>
            </div>
            <div className="v5-login-proof-card">
              <Fingerprint className="h-5 w-5" />
              <div>
                <h2>{t('v5LoginProofPasskeyTitle')}</h2>
                <p>{t('v5LoginProofPasskeyDesc')}</p>
              </div>
            </div>
          </div>
        </section>

        <section
          className={`vault-login-surface v5-login-panel relative w-full p-6 transition-all duration-300 sm:p-8 ${isError ? 'animate-shake border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.15)] bg-red-50/20' : ''}`}
        >
          <div className="v5-login-form-header flex flex-col items-center text-center">
            <div className="vault-login-logo-container mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner p-1 lg:hidden">
              <img
                src="./icon.png"
                alt="Aegis Logo"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
            <h1 className="v5-login-form-title mb-2 text-3xl font-semibold tracking-tight text-[var(--color-deep-navy)]">
              {isSetupMode ? t('setupVault') : t('premiumVault')}
            </h1>
            <p className="v5-login-form-subtitle mb-6 text-sm text-[var(--color-deep-navy)]/70">
              {t('subtitle')}
            </p>

            {/* ─── Multi-Vault Selector ─── */}
            {vaultProfiles.length > 0 && activeProfile && (
              <div className="relative w-full mb-3">
                <button
                  type="button"
                  onClick={() => setShowVaultSelector(!showVaultSelector)}
                  className="vault-login-field w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-left"
                  aria-expanded={showVaultSelector}
                  aria-haspopup="listbox"
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: activeProfile.color }}
                  />
                  <span className="text-sm font-semibold text-[var(--color-deep-navy)] flex-1 truncate">
                    {activeProfile.name}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--color-deep-navy)]/40 transition-transform ${showVaultSelector ? 'rotate-180' : ''}`}
                  />
                </button>

                {showVaultSelector && (
                  <div
                    className="vault-login-dropdown absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                    role="listbox"
                  >
                    {vaultProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-sage-green)]/10 transition-colors cursor-pointer group ${profile.id === activeProfile.id ? 'bg-[var(--color-sage-green)]/5' : ''}`}
                        onClick={() => handleSwitchVault(profile)}
                        role="option"
                        aria-selected={profile.id === activeProfile.id}
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: profile.color }}
                        />
                        <span className="text-sm font-medium text-[var(--color-deep-navy)] flex-1 truncate">
                          {profile.name}
                        </span>
                        {profile.id === activeProfile.id && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-sage-green)] bg-[var(--color-sage-green)]/10 px-2 py-0.5 rounded-full">
                            {t('active', 'Active')}
                          </span>
                        )}
                        {!profile.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVault(profile.id);
                            }}
                            className="p-1 rounded-md hover:bg-red-100 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            aria-label={t('deleteVault', 'Delete vault')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* New Vault */}
                    {showNewVaultInput ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 border-t vault-login-dropdown-divider">
                        <input
                          autoFocus
                          type="text"
                          value={newVaultName}
                          onChange={(e) => setNewVaultName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateVault();
                            if (e.key === 'Escape') setShowNewVaultInput(false);
                          }}
                          placeholder={t('vaultName', 'Vault name...')}
                          className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
                        />
                        <button
                          type="button"
                          onClick={handleCreateVault}
                          className="vault-login-create-btn text-[var(--color-sage-green)] text-xs font-bold hover:underline"
                        >
                          {t('create', 'Create')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowNewVaultInput(true)}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-[var(--color-sage-green)] hover:bg-[var(--color-sage-green)]/5 transition-colors border-t vault-login-dropdown-divider"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t('createNewVault', 'Create New Vault')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="vault-login-tabs flex p-1 rounded-xl w-full mb-2">
              <button
                type="button"
                onClick={() => {
                  setIsSetupMode(false);
                  setShowSetupSecret(false);
                  setSecretKey('');
                }}
                className={`login-tab-btn flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${!isSetupMode ? 'vault-login-tab-active text-white shadow-sm' : 'text-[var(--color-deep-navy)]/60'}`}
              >
                {t('unlock')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSetupMode(true);
                  setPassword('');
                  setSecretKey('');
                  setShowSetupSecret(false);
                }}
                className={`login-tab-btn flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${isSetupMode ? 'vault-login-tab-active text-white shadow-sm' : 'text-[var(--color-deep-navy)]/60'}`}
              >
                {t('initialize')}
              </button>
            </div>

            <div className="v5-login-trust-row mb-4 grid w-full grid-cols-2 gap-2">
              <div className="v5-login-trust-chip">
                <Lock className="h-3.5 w-3.5" />
                <span>{t('localVaultTrust', 'Local vault')}</span>
              </div>
              <div className="v5-login-trust-chip">
                <Shield className="h-3.5 w-3.5" />
                <span>{t('encryptedVaultTrust', 'SQLCipher protected')}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {!showSetupSecret ? (
              <div className="relative group">
                <Lock
                  className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${isError ? 'text-red-500/60' : 'text-[var(--color-deep-navy)]/40 group-focus-within:text-[var(--color-sage-green)]'}`}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isSetupMode ? t('createMasterPassword') : t('masterPassword')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (isError) setIsError(false);
                  }}
                  disabled={isDecrypting}
                  className={`vault-login-input w-full rounded-xl py-3.5 pl-11 pr-12 text-sm font-medium outline-none border shadow-inner transition-all disabled:opacity-50 ${isError ? 'border-red-500/50 focus:border-red-500/80 bg-red-50/20 text-red-900' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-deep-navy)]/40 hover:text-[var(--color-sage-green)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            ) : null}

            {!isSetupMode && !showSetupSecret && (
              <div className="relative group">
                <KeyRound
                  className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${isError ? 'text-red-500/60' : 'text-[var(--color-deep-navy)]/40 group-focus-within:text-[var(--color-sage-green)]'}`}
                />
                <input
                  type="text"
                  placeholder={t('deviceSecretKey')}
                  value={secretKey}
                  onChange={(e) => {
                    setSecretKey(e.target.value);
                    if (isError) setIsError(false);
                  }}
                  disabled={isDecrypting}
                  className={`vault-login-input w-full rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none border shadow-inner transition-all disabled:opacity-50 pass-font ${isError ? 'border-red-500/50 focus:border-red-500/80 bg-red-50/20 text-red-900' : ''}`}
                />
              </div>
            )}

            {isSetupMode && showSetupSecret && !isDecrypting && (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="vault-secret-panel rounded-xl p-4 flex flex-col items-center text-center">
                  <Shield className="w-8 h-8 text-[var(--color-sage-green)] mb-2" />
                  <h3 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">
                    {t('twoSecretConcept')}
                  </h3>
                  <p className="text-xs opacity-70 mb-3 px-2">{t('twoSecretDesc')}</p>
                  <div className="vault-secret-box w-full rounded-lg p-3 shadow-inner break-all pass-font text-sm font-bold opacity-80 select-all tracking-wider">
                    {secretKey}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadKit}
                  className="vault-login-download-btn flex items-center justify-center gap-2 w-full rounded-xl py-3.5 text-sm font-semibold tracking-wide shadow-sm transition-all active:scale-95"
                >
                  <FileDown className="w-4 h-4 text-[var(--color-sage-green)]" />
                  {t('downloadKit')}
                </button>
              </div>
            )}

            {isDecrypting ? (
              <div className="flex flex-col gap-3 mt-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-sage-green)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-sage-green)]"></span>
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-deep-navy)]/80 animate-pulse">
                      {progress < 30
                        ? t('validatingSecrets')
                        : progress < 70
                          ? t('derivingKey')
                          : t('unlockingVault')}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[var(--color-deep-navy)]/60">
                    {progress}%
                  </span>
                </div>

                {/* Dynamic Sage Green Security Indicator */}
                <div className="flex gap-1 h-3 w-full">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-[var(--color-deep-navy)]/10 overflow-hidden relative shadow-inner"
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-[var(--color-sage-green)] transition-all duration-300 ease-out"
                        style={{
                          width:
                            progress > i * 20
                              ? progress > (i + 1) * 20
                                ? '100%'
                                : `${(progress - i * 20) * 5}%`
                              : '0%',
                          opacity: progress > i * 20 ? 1 : 0.5,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold opacity-40">
                  <span>Argon2id</span>
                  <span>64MB / M-Hard</span>
                </div>
              </div>
            ) : isError ? (
              <div className="mt-2 w-full rounded-xl bg-red-500/10 border border-red-500/20 py-3.5 text-center text-sm font-semibold text-red-600 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                {t('accessDenied')}
              </div>
            ) : (
              <button
                type="submit"
                className="vault-login-unlock-btn btn-ink mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-deep-navy)] py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg transition-all hover:bg-[var(--color-deep-navy)]/90 active:scale-95"
              >
                {isSetupMode && !showSetupSecret ? (
                  <>
                    {t('generateSecret')} <ChevronRight className="w-4 h-4 opacity-70" />
                  </>
                ) : isSetupMode && showSetupSecret ? (
                  <>
                    {t('finalizeVault')} <Lock className="w-4 h-4 opacity-70" />
                  </>
                ) : (
                  t('unlockVault')
                )}
              </button>
            )}

            {!isSetupMode && !showSetupSecret && !isDecrypting && (
              <>
                <button
                  type="button"
                  onClick={handlePasskeyAction}
                  className="vault-login-passkey relative mt-2 flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-semibold tracking-wide transition-all shadow-sm active:scale-95 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                  <Fingerprint className="w-5 h-5 text-[var(--color-sage-green)] group-hover:scale-110 transition-transform" />
                  {hasPasskey ? t('biometricsUnlock') : t('biometricsRegister')}
                </button>

                {hasPasskey && passkeyNeedsRotation && (
                  <div className="mt-2 w-full rounded-xl border border-amber-300/40 bg-amber-50/60 px-3 py-2 text-[11px] font-medium text-amber-700">
                    {t('passkeyRotationRecommended')}
                  </div>
                )}

                {hasPasskey && (
                  <button
                    type="button"
                    onClick={handleRevokePasskey}
                    className="mt-2 text-[11px] font-semibold text-[var(--color-deep-navy)]/60 hover:text-red-600 transition-colors"
                  >
                    {t('passkeyRevokeButton')}
                  </button>
                )}
              </>
            )}

            {isSetupMode && !isDecrypting && (
              <button
                type="button"
                onClick={() => setShowWipeModal(true)}
                className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-red-500/60 hover:text-red-600 transition-colors text-center"
              >
                {t('factoryResetBtn')}
              </button>
            )}
          </form>
        </section>
      </main>

      <div className="vault-login-foot absolute bottom-8 text-center text-xs font-medium text-[var(--color-deep-navy)]/50 tracking-widest uppercase">
        {t('protectedBy')}
      </div>
      {showWipeModal && (
        <WipeConfirmationModal onCancel={() => setShowWipeModal(false)} onConfirm={handleWipe} />
      )}
    </div>
  );
}
