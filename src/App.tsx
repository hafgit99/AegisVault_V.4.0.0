import { useState, useEffect } from "react";
import { VaultLogin } from "./components/VaultLogin";
import "./i18n";
import { Dashboard } from "./components/Dashboard";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { extensionBridge } from "./lib/ExtensionBridge";
import { useAutoLock } from "./config/security-settings";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";

import { vaultService } from "./vaultService";

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [secretKeyStr, setSecretKeyStr] = useState("");

  // Kullanıcı hareketsiz kaldığında kilitle
  useAutoLock(async () => {
    setIsUnlocked(false);
    setSecretKeyStr(""); // Hafızadan sil
    await vaultService.lock(); // Belleği temizle ve şifreleri sanitizasyondan geçir
    extensionBridge.lockAndDisconnect(); // Extension bağlantısını kes
  }, isUnlocked);

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      extensionBridge.init();
      // Onboarding kontrolü: Daha önce tamamlanmamışsa göster
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
    // Burada ileride vaultService.setSecurityProfile(profile) çağrılabilir.
  };

  return (
    <>
      {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}
      <a href="#main-content" className="skip_to_content">
        Skip to main content
      </a>
      <div className="min-h-screen relative bg-[var(--color-cloud-dancer)] text-[var(--color-deep-navy)] flex flex-col items-center w-full" role="application" aria-label="Aegis Vault Password Manager">
        <div id="main-content" className="w-full flex flex-col items-center flex-1">
          {isUnlocked && secretKeyStr ? (
            <Dashboard onLock={() => setIsUnlocked(false)} secretKey={secretKeyStr} />
          ) : (
            <VaultLogin onUnlock={(sk) => {
              setSecretKeyStr(sk);
              setIsUnlocked(true);
            }} />
          )}
        </div>
        <ToastContainer position="bottom-right" theme="light" role="status" aria-live="polite" />
      </div>
    </>
  );
}

export default App;
