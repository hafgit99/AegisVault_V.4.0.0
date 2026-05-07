import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  EyeOff,
  FileKey2,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Vault,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

type SecurityProfile = 'standard' | 'advanced' | 'paranoid';
type RecoveryPlan = 'print' | 'encrypted-file' | 'offline-copy';
type BackupTarget = 'local' | 'encrypted-usb' | 'qr-sync';
type SecondFactorPlan = 'totp' | 'passkey' | 'both';
type PrivacyMode = 'balanced' | 'privacy' | 'strict';

interface OnboardingProps {
  onComplete: (profile: SecurityProfile) => void;
}

const STORAGE_KEY = 'aegis_onboarding_security_plan';

export const OnboardingWizard: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<SecurityProfile>('advanced');
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlan>('encrypted-file');
  const [backupTarget, setBackupTarget] = useState<BackupTarget>('encrypted-usb');
  const [secondFactorPlan, setSecondFactorPlan] = useState<SecondFactorPlan>('both');
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('privacy');
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const steps = useMemo(
    () => [
      {
        key: 'master',
        title: t('onboarding.master.title', 'Master password readiness'),
        desc: t(
          'onboarding.master.desc',
          'Start with a strong master password and a quiet recovery plan before adding records.'
        ),
        icon: LockKeyhole,
      },
      {
        key: 'recovery',
        title: t('onboarding.recovery.title', 'Recovery key custody'),
        desc: t(
          'onboarding.recovery.desc',
          'Decide where the emergency recovery material lives before the vault becomes mission-critical.'
        ),
        icon: FileKey2,
      },
      {
        key: 'backup',
        title: t('onboarding.backup.title', 'Backup destination'),
        desc: t(
          'onboarding.backup.desc',
          'Choose a backup target that stays encrypted, testable, and offline-friendly.'
        ),
        icon: Download,
      },
      {
        key: 'secondFactor',
        title: t('onboarding.secondFactor.title', '2FA and passkey setup'),
        desc: t(
          'onboarding.secondFactor.desc',
          'Prepare a second factor path for high-value accounts and device unlock flows.'
        ),
        icon: Fingerprint,
      },
      {
        key: 'privacy',
        title: t('onboarding.privacy.title', 'Privacy mode'),
        desc: t(
          'onboarding.privacy.desc',
          'Select how aggressively Aegis should reduce visible identity, alias, and autofill exposure.'
        ),
        icon: EyeOff,
      },
      {
        key: 'finish',
        title: t('onboarding.finalize.title', 'Secure setup plan ready'),
        desc: t(
          'onboarding.finalize.desc',
          'Your first three minutes are mapped. Aegis will keep these choices as your local security baseline.'
        ),
        icon: ShieldCheck,
      },
    ],
    [t]
  );

  const setupScore = useMemo(() => {
    const profileScore = profile === 'paranoid' ? 24 : profile === 'advanced' ? 21 : 17;
    const recoveryScore = recoveryPlan === 'offline-copy' ? 20 : 18;
    const backupScore = backupTarget === 'encrypted-usb' ? 18 : 16;
    const secondFactorScore = secondFactorPlan === 'both' ? 20 : 16;
    const privacyScore = privacyMode === 'strict' ? 18 : privacyMode === 'privacy' ? 16 : 13;
    return Math.min(
      100,
      profileScore + recoveryScore + backupScore + secondFactorScore + privacyScore
    );
  }, [backupTarget, privacyMode, profile, recoveryPlan, secondFactorPlan]);

  const savePlan = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile,
        recoveryPlan,
        backupTarget,
        secondFactorPlan,
        privacyMode,
        setupScore,
        completedAt: new Date().toISOString(),
      })
    );
  };

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    savePlan();
    onComplete(profile);
  };

  const prevStep = () => {
    if (step > 0) setStep((current) => current - 1);
  };

  useEffect(() => {
    nextButtonRef.current?.focus();
  }, [step]);

  const renderChoice = <T extends string>({
    value,
    selected,
    onSelect,
    icon,
    title,
    desc,
    badge,
  }: {
    value: T;
    selected: T;
    onSelect: (value: T) => void;
    icon: React.ReactNode;
    title: string;
    desc: string;
    badge?: string;
  }) => (
    <button
      key={value}
      type="button"
      onClick={() => onSelect(value)}
      className={`group flex min-h-[92px] w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
        selected === value
          ? 'border-[var(--color-sage-green)] bg-[var(--color-sage-green)]/14 shadow-sm'
          : 'border-white/10 bg-white/[0.04] hover:border-white/20 dark:border-white/10'
      }`}
    >
      <span
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          selected === value
            ? 'bg-[var(--color-sage-green)] text-white'
            : 'bg-white/8 text-white/65'
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{title}</span>
          {badge ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white/65">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-white/58">{desc}</span>
      </span>
      {selected === value ? (
        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--color-sage-green)]" />
      ) : null}
    </button>
  );

  const renderStepContent = () => {
    const CurrentIcon = steps[step].icon;

    return (
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22 }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]"
        role="document"
      >
        <section className="min-w-0">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-[var(--color-sage-green)]">
              <CurrentIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--color-sage-green)]">
                {t('onboarding.kicker', 'Secure setup')}
              </p>
              <h2
                className="mt-2 text-2xl font-black tracking-tight text-white"
                id={`step-title-${step}`}
              >
                {steps[step].title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/62">
                {steps[step].desc}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {step === 0 && (
              <>
                {renderChoice<SecurityProfile>({
                  value: 'standard',
                  selected: profile,
                  onSelect: setProfile,
                  icon: <ShieldCheck className="h-5 w-5" />,
                  title: t('onboarding.profile.standard.name', 'Standard'),
                  desc: t(
                    'onboarding.profile.standard.desc',
                    'Fast daily protection with practical timeouts and guided defaults.'
                  ),
                })}
                {renderChoice<SecurityProfile>({
                  value: 'advanced',
                  selected: profile,
                  onSelect: setProfile,
                  icon: <Vault className="h-5 w-5" />,
                  title: t('onboarding.profile.advanced.name', 'Advanced'),
                  desc: t(
                    'onboarding.profile.advanced.desc',
                    'Recommended baseline with stronger key derivation, recovery prompts, and passkey readiness.'
                  ),
                  badge: t('onboarding.recommended', 'Recommended'),
                })}
                {renderChoice<SecurityProfile>({
                  value: 'paranoid',
                  selected: profile,
                  onSelect: setProfile,
                  icon: <LockKeyhole className="h-5 w-5" />,
                  title: t('onboarding.profile.paranoid.name', 'Paranoid'),
                  desc: t(
                    'onboarding.profile.paranoid.desc',
                    'Maximum local protection with stricter timeouts and reduced convenience.'
                  ),
                })}
              </>
            )}

            {step === 1 && (
              <>
                {renderChoice<RecoveryPlan>({
                  value: 'encrypted-file',
                  selected: recoveryPlan,
                  onSelect: setRecoveryPlan,
                  icon: <FileKey2 className="h-5 w-5" />,
                  title: t('onboarding.recovery.encryptedFile.title', 'Encrypted recovery file'),
                  desc: t(
                    'onboarding.recovery.encryptedFile.desc',
                    'Store the recovery material as an encrypted file on offline media.'
                  ),
                  badge: t('onboarding.recommended', 'Recommended'),
                })}
                {renderChoice<RecoveryPlan>({
                  value: 'print',
                  selected: recoveryPlan,
                  onSelect: setRecoveryPlan,
                  icon: <KeyRound className="h-5 w-5" />,
                  title: t('onboarding.recovery.print.title', 'Printed emergency sheet'),
                  desc: t(
                    'onboarding.recovery.print.desc',
                    'Keep a sealed offline copy for break-glass recovery.'
                  ),
                })}
                {renderChoice<RecoveryPlan>({
                  value: 'offline-copy',
                  selected: recoveryPlan,
                  onSelect: setRecoveryPlan,
                  icon: <ShieldCheck className="h-5 w-5" />,
                  title: t('onboarding.recovery.offline.title', 'Dual offline custody'),
                  desc: t(
                    'onboarding.recovery.offline.desc',
                    'Use two separate offline locations for higher continuity assurance.'
                  ),
                })}
              </>
            )}

            {step === 2 && (
              <>
                {renderChoice<BackupTarget>({
                  value: 'encrypted-usb',
                  selected: backupTarget,
                  onSelect: setBackupTarget,
                  icon: <Download className="h-5 w-5" />,
                  title: t('onboarding.backup.usb.title', 'Encrypted USB backup'),
                  desc: t(
                    'onboarding.backup.usb.desc',
                    'Best balance for offline vault backups that can be tested and rotated.'
                  ),
                  badge: t('onboarding.recommended', 'Recommended'),
                })}
                {renderChoice<BackupTarget>({
                  value: 'qr-sync',
                  selected: backupTarget,
                  onSelect: setBackupTarget,
                  icon: <Fingerprint className="h-5 w-5" />,
                  title: t('onboarding.backup.qr.title', 'QR sync handoff'),
                  desc: t(
                    'onboarding.backup.qr.desc',
                    'Use QR/device pairing for an air-gapped transfer workflow.'
                  ),
                })}
                {renderChoice<BackupTarget>({
                  value: 'local',
                  selected: backupTarget,
                  onSelect: setBackupTarget,
                  icon: <Vault className="h-5 w-5" />,
                  title: t('onboarding.backup.local.title', 'Local OPFS only'),
                  desc: t(
                    'onboarding.backup.local.desc',
                    'Keep data local first, then schedule a backup test before adding critical records.'
                  ),
                })}
              </>
            )}

            {step === 3 && (
              <>
                {renderChoice<SecondFactorPlan>({
                  value: 'both',
                  selected: secondFactorPlan,
                  onSelect: setSecondFactorPlan,
                  icon: <Fingerprint className="h-5 w-5" />,
                  title: t('onboarding.secondFactor.both.title', 'TOTP + passkey'),
                  desc: t(
                    'onboarding.secondFactor.both.desc',
                    'Recommended for important accounts: store TOTP and prepare passkey inventory review.'
                  ),
                  badge: t('onboarding.recommended', 'Recommended'),
                })}
                {renderChoice<SecondFactorPlan>({
                  value: 'totp',
                  selected: secondFactorPlan,
                  onSelect: setSecondFactorPlan,
                  icon: <KeyRound className="h-5 w-5" />,
                  title: t('onboarding.secondFactor.totp.title', 'TOTP first'),
                  desc: t(
                    'onboarding.secondFactor.totp.desc',
                    'Start with authenticator codes and add passkeys after importing records.'
                  ),
                })}
                {renderChoice<SecondFactorPlan>({
                  value: 'passkey',
                  selected: secondFactorPlan,
                  onSelect: setSecondFactorPlan,
                  icon: <LockKeyhole className="h-5 w-5" />,
                  title: t('onboarding.secondFactor.passkey.title', 'Passkey first'),
                  desc: t(
                    'onboarding.secondFactor.passkey.desc',
                    'Prioritize site passkeys, RP ID visibility, and device unlock readiness.'
                  ),
                })}
              </>
            )}

            {step === 4 && (
              <>
                {renderChoice<PrivacyMode>({
                  value: 'privacy',
                  selected: privacyMode,
                  onSelect: setPrivacyMode,
                  icon: <EyeOff className="h-5 w-5" />,
                  title: t('onboarding.privacy.privacy.title', 'Privacy enhanced'),
                  desc: t(
                    'onboarding.privacy.privacy.desc',
                    'Use aliases, cautious autofill, and quieter identity exposure by default.'
                  ),
                  badge: t('onboarding.recommended', 'Recommended'),
                })}
                {renderChoice<PrivacyMode>({
                  value: 'balanced',
                  selected: privacyMode,
                  onSelect: setPrivacyMode,
                  icon: <ShieldCheck className="h-5 w-5" />,
                  title: t('onboarding.privacy.balanced.title', 'Balanced'),
                  desc: t(
                    'onboarding.privacy.balanced.desc',
                    'Keep the workflow fast while preserving baseline alias and Watchtower checks.'
                  ),
                })}
                {renderChoice<PrivacyMode>({
                  value: 'strict',
                  selected: privacyMode,
                  onSelect: setPrivacyMode,
                  icon: <LockKeyhole className="h-5 w-5" />,
                  title: t('onboarding.privacy.strict.title', 'Strict privacy'),
                  desc: t(
                    'onboarding.privacy.strict.desc',
                    'Prefer manual approval, reduced reveal surfaces, and stricter sensitive actions.'
                  ),
                })}
              </>
            )}

            {step === 5 && (
              <div className="rounded-2xl border border-[var(--color-sage-green)]/30 bg-[var(--color-sage-green)]/10 p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-7 w-7 text-[var(--color-sage-green)]" />
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {t('onboarding.finalize.planTitle', 'Baseline selected')}
                    </h3>
                    <p className="mt-1 text-sm text-white/62">
                      {t(
                        'onboarding.finalize.planDesc',
                        'Aegis will store this onboarding plan locally and use it as your first security checklist.'
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-2 text-sm text-white/72 sm:grid-cols-2">
                  <span>
                    {t('onboarding.finalize.profile', 'Profile')}:{' '}
                    {t(`onboarding.profile.${profile}.name`, profile)}
                  </span>
                  <span>
                    {t('onboarding.finalize.recovery', 'Recovery')}:{' '}
                    {t(
                      `onboarding.recovery.${recoveryPlan === 'encrypted-file' ? 'encryptedFile' : recoveryPlan === 'offline-copy' ? 'offline' : 'print'}.title`,
                      recoveryPlan
                    )}
                  </span>
                  <span>
                    {t('onboarding.finalize.backup', 'Backup')}:{' '}
                    {t(
                      `onboarding.backup.${backupTarget === 'encrypted-usb' ? 'usb' : backupTarget === 'qr-sync' ? 'qr' : 'local'}.title`,
                      backupTarget
                    )}
                  </span>
                  <span>
                    {t('onboarding.finalize.privacy', 'Privacy')}:{' '}
                    {t(`onboarding.privacy.${privacyMode}.title`, privacyMode)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            {t('onboarding.trustPanel.title', 'Setup trust')}
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-4xl font-black text-white">{setupScore}</span>
            <span className="pb-1 text-xs font-bold uppercase tracking-widest text-[var(--color-sage-green)]">
              {t('onboarding.trustPanel.score', 'score')}
            </span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--color-sage-green)] transition-all"
              style={{ width: `${setupScore}%` }}
            />
          </div>
          <div className="mt-5 space-y-3 text-xs text-white/62">
            {[
              t('onboarding.trustPanel.master', 'Strong master password checkpoint'),
              t('onboarding.trustPanel.recovery', 'Recovery custody selected'),
              t('onboarding.trustPanel.backup', 'Encrypted backup target selected'),
              t('onboarding.trustPanel.secondFactor', '2FA/passkey path selected'),
              t('onboarding.trustPanel.privacy', 'Privacy mode selected'),
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-sage-green)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#0f1724]/95 p-4 backdrop-blur-xl">
      <div
        className="relative w-full max-w-5xl rounded-[24px] border border-white/10 bg-[#111c2b] p-5 shadow-2xl md:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`step-title-${step}`}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-sage-green)] text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
                {t('onboarding.headerEyebrow', 'Aegis Vault 5.0')}
              </p>
              <h1 className="text-xl font-black text-white">
                {t('onboarding.headerTitle', 'Professional onboarding')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {steps.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStep(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === step
                    ? 'w-9 bg-[var(--color-sage-green)]'
                    : index < step
                      ? 'w-5 bg-[var(--color-sage-green)]/45'
                      : 'w-5 bg-white/12'
                }`}
                aria-label={t('onboarding.goToStep', 'Go to setup step {{step}}', {
                  step: index + 1,
                })}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

        <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 0}
            className={`text-white/70 hover:bg-white/8 hover:text-white ${
              step === 0 ? 'pointer-events-none opacity-0' : ''
            }`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('onboarding.back', 'Back')}
          </Button>

          <p className="hidden text-xs text-white/42 md:block">
            {t(
              'onboarding.anytime',
              'You can change these settings anytime from the Vault Settings panel.'
            )}
          </p>

          <Button
            ref={nextButtonRef}
            onClick={nextStep}
            data-testid="onboarding-next"
            className="min-w-[160px] rounded-xl bg-[var(--color-sage-green)] text-white hover:bg-[var(--color-sage-green)]/90"
            aria-label={
              step === steps.length - 1
                ? t('onboarding.finish', 'Start Using Vault')
                : t('onboarding.next', 'Continue')
            }
          >
            {step === steps.length - 1
              ? t('onboarding.finish', 'Start Using Vault')
              : t('onboarding.next', 'Continue')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
