import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Puzzle, ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SecureAppSettings } from '../lib/SecureAppSettings';

interface SpotlightWalkthroughProps {
  onVisibilityChange?: (isOpen: boolean) => void;
  onSettled?: () => void;
}

export function SpotlightWalkthrough({ onVisibilityChange, onSettled }: SpotlightWalkthroughProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let openTimer: number | undefined;

    void SecureAppSettings.initialize().then(() => {
      const skipTour =
        localStorage.getItem('aegis_bypass_tour') === 'true' ||
        localStorage.getItem('aegis_onboarding_done') === 'true';

      if (!SecureAppSettings.getHasSeenTour() && !skipTour) {
        openTimer = window.setTimeout(() => {
          const shouldSkipLate =
            localStorage.getItem('aegis_bypass_tour') === 'true' ||
            localStorage.getItem('aegis_onboarding_done') === 'true' ||
            SecureAppSettings.getHasSeenTour();

          if (shouldSkipLate) {
            onSettled?.();
            return;
          }

          setIsOpen(true);
        }, 1100);
      } else {
        onSettled?.();
      }
    });

    return () => {
      if (openTimer) window.clearTimeout(openTimer);
    };
  }, [onSettled]);

  useEffect(() => {
    onVisibilityChange?.(isOpen);
  }, [isOpen, onVisibilityChange]);

  const closeTour = () => {
    setIsOpen(false);
    SecureAppSettings.setHasSeenTour(true);
    onSettled?.();
  };

  const steps = [
    {
      title: t('spotlight.extension.title', 'Discover the browser extension'),
      content: t(
        'spotlight.extension.content',
        'Use Aegis Vault WXT to fill credentials without copying secrets by hand. The extension only works with your unlocked local vault.'
      ),
      badge: t('spotlight.extension.badge', 'Local extension'),
      icon: <Puzzle className="h-6 w-6" />,
    },
    {
      title: t('spotlight.autofill.title', 'Secure Autofill'),
      content: t(
        'spotlight.autofill.content',
        'When you focus a login field, Aegis offers matching records with origin-aware checks and zero-knowledge local storage.'
      ),
      badge: t('spotlight.autofill.badge', 'Origin checked'),
      icon: <ShieldCheck className="h-6 w-6" />,
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step >= steps.length - 1;

  if (!isOpen) return null;

  return (
    <div
      className="spotlight-tour-root fixed inset-0 z-[200] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotlight-tour-title"
    >
      <button
        type="button"
        className="spotlight-tour-backdrop absolute inset-0"
        aria-label={t('spotlight.close', 'Close introduction')}
        onClick={closeTour}
      />

      <section className="spotlight-tour-card relative w-full max-w-[520px] overflow-hidden">
        <div className="spotlight-tour-topbar">
          <span className="spotlight-tour-eyebrow">{t('spotlight.eyebrow', 'Aegis Vault')}</span>
          <button
            type="button"
            onClick={closeTour}
            className="spotlight-tour-close"
            aria-label={t('spotlight.close', 'Close introduction')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="spotlight-tour-content">
          <div className="spotlight-tour-icon" aria-hidden="true">
            {currentStep.icon}
          </div>

          <span className="spotlight-tour-badge">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {currentStep.badge}
          </span>

          <div className="spotlight-tour-copy">
            <h2 id="spotlight-tour-title">{currentStep.title}</h2>
            <p>{currentStep.content}</p>
          </div>

          <div className="spotlight-tour-assurance">
            <span>{t('spotlight.assurance.offline', 'Offline-first')}</span>
            <span>{t('spotlight.assurance.noPlaintext', 'No plaintext sync')}</span>
            <span>{t('spotlight.assurance.userControl', 'User approved')}</span>
          </div>
        </div>

        <div className="spotlight-tour-footer">
          <div
            className="spotlight-tour-dots"
            aria-label={t('spotlight.progress', 'Introduction progress')}
          >
            {steps.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setStep(index)}
                className={step === index ? 'spotlight-tour-dot-active' : ''}
                aria-label={t('spotlight.goToStep', 'Go to introduction step {{step}}', {
                  step: index + 1,
                })}
                aria-current={step === index ? 'step' : undefined}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => (isLastStep ? closeTour() : setStep((value) => value + 1))}
            className="spotlight-tour-primary"
          >
            {isLastStep ? t('spotlight.start', 'Start') : t('spotlight.next', 'Next')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
