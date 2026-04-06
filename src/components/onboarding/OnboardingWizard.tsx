import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Zap,
  ChevronRight,
  ChevronLeft,
  Download,
  Smartphone,
  FileUp,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { GlowCard } from '../ui/GlowCard';

interface OnboardingProps {
  onComplete: (profile: 'standard' | 'advanced' | 'paranoid') => void;
}

export const OnboardingWizard: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<'standard' | 'advanced' | 'paranoid'>('advanced');

  const steps = [
    {
      title: t('onboarding.welcome.title', "Aegis Vault'a Hoş Geldiniz"),
      description: t(
        'onboarding.welcome.desc',
        'Sıfır-bilgi (Zero-Knowledge) mimarisi ile dijital varlıklarınızı en üst düzeyde koruyun.'
      ),
      icon: ShieldCheck,
      color: 'text-blue-400',
    },
    {
      title: t('onboarding.profile.title', 'Güvenlik Profilinizi Seçin'),
      description: t(
        'onboarding.profile.desc',
        'İhtiyacınıza en uygun güvenlik ve kullanım dengesini belirleyin.'
      ),
      icon: Lock,
      color: 'text-purple-400',
    },
    {
      title: t('onboarding.extension.title', 'Tarayıcı Deneyimini Güçlendirin'),
      description: t(
        'onboarding.extension.desc',
        'Aegis Extension ile şifrelerinizi formlara otomatik doldurun.'
      ),
      icon: Zap,
      color: 'text-yellow-400',
    },
    {
      title: t('onboarding.mobile.title', 'Her Yerde Güvenle Erişin'),
      description: t(
        'onboarding.mobile.desc',
        'Mobil uygulamamızı yükleyin ve QR kod ile kasanızı eşleştirin.'
      ),
      icon: Smartphone,
      color: 'text-green-400',
    },
    {
      title: t('onboarding.finalize.title', 'Her Şey Hazır!'),
      description: t(
        'onboarding.finalize.desc',
        'Kasanız güvenli bir şekilde oluşturuldu ve kullanıma hazır.'
      ),
      icon: CheckCircle2,
      color: 'text-cyan-400',
    },
  ];

  const nextStep = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete(profile);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const nextButtonRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Step değişiminde odağı ana butona al (Klavye navigasyonu için)
    nextButtonRef.current?.focus();
  }, [step]);

  const renderStepContent = () => {
    const currentIcon = steps[step].icon;

    return (
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center text-center space-y-6 max-w-lg mx-auto"
        role="document"
      >
        <div
          className={`p-5 rounded-2xl bg-white/5 border border-white/10 ${steps[step].color}`}
          aria-hidden="true"
        >
          {React.createElement(currentIcon, { size: 48 })}
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-white" id={`step-title-${step}`}>
            {steps[step].title}
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">{steps[step].description}</p>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 gap-4 w-full mt-8">
            {(['standard', 'advanced', 'paranoid'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProfile(p)}
                className={`group relative flex items-start p-4 rounded-xl border transition-all duration-300 ${
                  profile === p
                    ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/20'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div
                  className={`mt-0.5 p-2 rounded-lg ${profile === p ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/50'}`}
                >
                  {p === 'standard' && <ShieldCheck size={18} />}
                  {p === 'advanced' && <Zap size={18} />}
                  {p === 'paranoid' && <Lock size={18} />}
                </div>
                <div className="ml-4 text-left">
                  <h4 className="font-semibold text-white capitalize">
                    {t(`onboarding.profile.${p}.name`, p)}
                  </h4>
                  <p className="text-sm text-white/40 mt-1">
                    {t(`onboarding.profile.${p}.desc`, `Security level for ${p} use cases.`)}
                  </p>
                </div>
                {profile === p && (
                  <motion.div layoutId="active-profile" className="absolute top-2 right-2">
                    <CheckCircle2 size={16} className="text-blue-500" />
                  </motion.div>
                )}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center space-y-6 w-full mt-4">
            <div className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-2xl w-full flex flex-col items-center">
              <Download size={40} className="text-blue-500 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">
                {t('onboarding.extension.browser', 'Chrome / Firefox / Edge')}
              </h3>
              <p className="text-white/40 text-sm mb-6">
                {t(
                  'onboarding.extension.install_desc',
                  'Uzantıyı yükleyerek şifre dolumunu otomatiğe bağlayın.'
                )}
              </p>
              <Button variant="secondary" className="w-full">
                {t('onboarding.extension.button', 'Uzantıyı İndir')}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center space-y-6 w-full mt-4">
            <div className="p-8 bg-green-500/5 border border-green-500/20 rounded-2xl w-full flex flex-col items-center">
              <div className="p-4 bg-white rounded-lg mb-4">
                {/* Placeholder for QR code icon or actual QR if needed later */}
                <Smartphone size={64} className="text-black" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">
                {t('onboarding.mobile.sync', 'Mobil Senkronizasyon')}
              </h3>
              <p className="text-white/40 text-sm">
                {t(
                  'onboarding.mobile.app_desc',
                  'iOS ve Android uygulamalarımızla verilerinizi her an yanınızda taşıyın.'
                )}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />

      <div
        className="relative w-full max-w-2xl bg-white/[0.02] border border-white/10 rounded-[2.5rem] shadow-2xl p-8 md:p-12 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`step-title-${step}`}
      >
        {/* Progress Indicators */}
        <div className="flex justify-center space-x-2 mb-12">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === step
                  ? 'w-8 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                  : i < step
                    ? 'w-4 bg-blue-500/40'
                    : 'w-4 bg-white/10'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

        {/* Footer Actions */}
        <div className="mt-12 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 0}
            className={`transition-all duration-300 ${step === 0 ? 'opacity-0 scale-90' : 'opacity-100'}`}
            aria-hidden={step === 0}
          >
            <ChevronLeft size={20} className="mr-2" />
            {t('onboarding.back', 'Geri')}
          </Button>

          <Button
            ref={nextButtonRef}
            onClick={nextStep}
            className="min-w-[140px] h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
            aria-label={
              step === steps.length - 1
                ? t('onboarding.finish', 'Başla')
                : t('onboarding.next', 'Devam Et')
            }
          >
            {step === steps.length - 1
              ? t('onboarding.finish', 'Başla')
              : t('onboarding.next', 'Devam Et')}
            <ChevronRight size={20} className="ml-2" />
          </Button>
        </div>
      </div>

      {/* Bottom Tip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-10 flex items-center text-white/30 text-sm"
      >
        <Info size={14} className="mr-2" />
        {t(
          'onboarding.anytime',
          'Bu ayarları dilediğiniz zaman Kasa Ayarları panelinden değiştirebilirsiniz.'
        )}
      </motion.div>
    </div>
  );
};
