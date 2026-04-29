import { lazy, Suspense, useState, useEffect } from 'react';
import { VaultLogin } from './components/VaultLogin';
import './i18n';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { extensionBridge } from './lib/ExtensionBridge';
import { useAutoLock } from './config/security-settings';

import { vaultService } from './vaultService';

const Dashboard = lazy(() =>
  import('./components/Dashboard').then((module) => ({ default: module.Dashboard }))
);
const OnboardingWizard = lazy(() =>
  import('./components/onboarding/OnboardingWizard').then((module) => ({
    default: module.OnboardingWizard,
  }))
);

function AppLoadingFallback() {
  return (
    <div className="flex min-h-[240px] w-full items-center justify-center px-6 text-center">
      <div className="rounded-xl border border-black/10 bg-white/70 px-5 py-4 text-sm font-semibold text-[var(--color-deep-navy)] shadow-sm dark:border-white/10 dark:bg-white/5">
        Loading secure workspace...
      </div>
    </div>
  );
}

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Lock when user is idle.
  useAutoLock(async () => {
    setIsUnlocked(false);
    await vaultService.lock();
    extensionBridge.lockAndDisconnect();
  }, isUnlocked);

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      extensionBridge.init();
      const isDone = localStorage.getItem('aegis_onboarding_done');
      if (!isDone) setShowOnboarding(true);
    } else {
      extensionBridge.dispose();
      setShowOnboarding(false);
    }
  }, [isUnlocked]);

  const handleOnboardingComplete = (profile: string) => {
    localStorage.setItem('aegis_onboarding_done', 'true');
    localStorage.setItem('aegis_security_profile', profile);
    setShowOnboarding(false);
  };

  return (
    <>
      <Suspense fallback={<AppLoadingFallback />}>
        {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}
      </Suspense>
      <a href="#main-content" className="skip_to_content">
        Skip to main content
      </a>
      <div
        className="min-h-screen relative bg-[var(--color-cloud-dancer)] text-[var(--color-deep-navy)] flex flex-col items-center w-full"
        role="application"
        aria-label="Aegis Vault Password Manager"
      >
        <div id="main-content" className="w-full flex flex-col items-center flex-1">
          <Suspense fallback={<AppLoadingFallback />}>
            {isUnlocked ? (
              <Dashboard onLock={() => setIsUnlocked(false)} />
            ) : (
              <VaultLogin
                onUnlock={() => {
                  setIsUnlocked(true);
                }}
              />
            )}
          </Suspense>
        </div>
        <ToastContainer position="bottom-right" theme="light" role="status" aria-live="polite" />
      </div>
    </>
  );
}

export default App;
