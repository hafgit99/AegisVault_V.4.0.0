import { useState, useEffect } from "react";
import { VaultLogin } from "./components/VaultLogin";
import "./i18n";
import { Dashboard } from "./components/Dashboard";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { extensionBridge } from "./lib/ExtensionBridge";

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [secretKeyStr, setSecretKeyStr] = useState("");

  useEffect(() => {
    if (isUnlocked) {
      extensionBridge.init(); // Kasamız açıkken eklentiden gelen bağlantıları dinlemeye hazırız
    } else {
      extensionBridge.dispose(); // Kasa kapalıyken tüm dış istek bağlantılarını kopar
    }
  }, [isUnlocked]);

  return (
    <div className="min-h-screen relative bg-[var(--color-cloud-dancer)] text-[var(--color-deep-navy)] flex flex-col items-center">
      {isUnlocked && secretKeyStr ? (
        <Dashboard onLock={() => setIsUnlocked(false)} secretKey={secretKeyStr} />
      ) : (
        <VaultLogin onUnlock={(sk) => {
          setSecretKeyStr(sk);
          setIsUnlocked(true);
        }} />
      )}
      <ToastContainer position="bottom-right" theme="light" />
    </div>
  );
}

export default App;
