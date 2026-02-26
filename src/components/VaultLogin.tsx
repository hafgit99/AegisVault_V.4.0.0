import { useState, useEffect } from "react";
import { vaultService } from "../vaultService";
import { Shield, Lock, Download, KeyRound, ChevronRight, FileDown, Fingerprint, Globe, Eye, EyeOff } from "lucide-react";
import { authenticatePasskeyWithPRF, registerPasskeyWithPRF, encryptWithPRF, decryptWithPRF } from '../lib/webAuthn';
import { toast } from 'react-toastify';
import jsPDF from "jspdf";
import { useTranslation } from 'react-i18next';

export function VaultLogin({ onUnlock }: { onUnlock: (secretKey: string) => void }) {
  const { t, i18n } = useTranslation();
  const [password, setPassword] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isError, setIsError] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [showSetupSecret, setShowSetupSecret] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setHasPasskey(!!localStorage.getItem('aegis_passkey_id'));
  }, []);
  
  // Create a fast random hex string for 128-bit key simulation
  const generateSecretKey = () => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    setSecretKey(hex);
    setShowSetupSecret(true);
  };

  const handleDownloadKit = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica");
    doc.text("Aegis Vault - Emergency Kit", 20, 20);
    doc.text("STORE THIS SECURELY. NEVER SHARE IT.", 20, 30);
    doc.text(`Your Device Secret Key: ${secretKey}`, 20, 50);
    doc.text("To unlock your vault on a new device, you will need this key", 20, 60);
    doc.text("in addition to your Master Password.", 20, 70);
    doc.save("Aegis_Emergency_Secret_Kit.pdf");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    // Duress Mode & Silent Wipe Check
    const duressPin = localStorage.getItem('aegis_duress_pin');
    const killPin = localStorage.getItem('aegis_kill_pin');

    if (password === killPin && killPin) {
      setIsDecrypting(true);
      setProgress(0);
      const interval = setInterval(() => setProgress(p => p < 100 ? p + 20 : 100), 100);
      await new Promise(r => setTimeout(r, 1000));
      await vaultService.wipeAllData();
      clearInterval(interval);
      toast.error(t('wrongPassOrWipe')); // Stealth: show error instead of "Wiped"
      setIsDecrypting(false);
      setProgress(0);
      setPassword("");
      return;
    }

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

    const isDuress = password === duressPin && duressPin;
    const dbName = isDuress ? 'aegis_dummy_vault' : 'aegis_opfs_vault';

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
      if (!activeSecret) throw new Error("Secret key is required");
      await vaultService.initDb(password, activeSecret, dbName, isSetupMode);
      clearInterval(interval);
      setProgress(100);
      if (isDuress) console.warn(t('dummyVaultLoaded'));
      setTimeout(() => onUnlock(activeSecret), 600);
    } catch (err: any) {
      console.error(err);
      clearInterval(interval);
      setIsDecrypting(false);
      setProgress(0);
      setIsError(true);
      
      const errMsg = err.message || "";
      if (errMsg.includes("Invalid credentials")) {
        toast.error(t('wrongPassOrWipe'));
      } else if (errMsg.includes("Invalid device secret key")) {
        toast.error(t('invalidDeviceKey'));
      } else if (errMsg.includes("VAULT_ALREADY_EXISTS")) {
        toast.warning(t('vaultAlreadyExists'));
      } else {
        toast.error(t('accessDenied'));
      }
      
      setTimeout(() => setIsError(false), 2000);
    }
  };

  const handleWipe = async () => {
    if (window.confirm(t('confirmFullWipe'))) {
       await vaultService.wipeAllData();
       window.location.reload();
    }
  };

  const handlePasskeyAction = async () => {
    setIsError(false);

    if (hasPasskey) {
      // Authentication Flow
      const credId = localStorage.getItem('aegis_passkey_id');
      const encData = localStorage.getItem('aegis_passkey_data');
      const prfSalt = localStorage.getItem('aegis_prf_salt');
      if (!credId || !encData || !prfSalt) return;

      try {
        const prfKey = await authenticatePasskeyWithPRF(credId, prfSalt);
        if (prfKey) {
          const payloadStr = await decryptWithPRF(prfKey, encData);
          const payload = JSON.parse(payloadStr);
          
          setPassword(payload.password);
          setSecretKey(payload.secretKey);
          setIsDecrypting(true);

          const interval = setInterval(() => {
            setProgress((p) => {
              if (p >= 90) { clearInterval(interval); return 90; }
              return p + 15;
            });
          }, 200);

          try {
            await vaultService.initDb(payload.password, payload.secretKey);
            clearInterval(interval);
            setProgress(100);
            setTimeout(() => onUnlock(payload.secretKey), 600);
          } catch (err) {
            console.error(err);
            clearInterval(interval);
            setIsDecrypting(false);
            setProgress(0);
            setIsError(true);
            setTimeout(() => setIsError(false), 2000);
          }
        } else {
            toast.error(t('bioAuthFailed'));
        }
      } catch (e) {
        console.warn("Passkey authentication canceled or failed", e);
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
          const payload = JSON.stringify({ password, secretKey: currentSecret });
          const encObj = await encryptWithPRF(passkeyRes.prfKey, payload);
          localStorage.setItem('aegis_passkey_id', passkeyRes.id);
          localStorage.setItem('aegis_passkey_data', encObj);
          localStorage.setItem('aegis_prf_salt', passkeyRes.salt);
          setHasPasskey(true);
          toast.success(t('bioAdded'));
        } else {
          toast.error(t('bioNotSupported'));
        }
      } catch (e) {
        console.error("Passkey registration failed", e);
        toast.error(t('bioCanceled'));
      }
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[var(--color-cloud-dancer)]">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          type="button"
          onClick={() => i18n.changeLanguage(i18n.language.startsWith('en') ? 'tr' : 'en')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/40 border border-[var(--color-sage-green)]/20 hover:bg-white/80 transition-all text-xs font-bold shadow-sm backdrop-blur-md text-[var(--color-deep-navy)]"
        >
          <Globe className="w-3.5 h-3.5" />
          {i18n.language.startsWith('en') ? 'EN' : 'TR'}
        </button>
      </div>
      {/* Aurora Background Effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(135,159,132,0.15)] via-transparent to-[rgba(10,17,40,0.05)] opacity-80 animate-aurora" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--color-sage-green)_0%,_transparent_60%)] opacity-20 blur-[100px] mix-blend-multiply pointer-events-none" />
      </div>

      <div className={`relative z-10 w-full max-w-md p-8 glass-card transition-all duration-300 ${isError ? 'animate-shake border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.15)] bg-red-50/20' : ''}`}>
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60 shadow-inner p-1">
            <img src="./icon.png" alt="Aegis Logo" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-[var(--color-deep-navy)]">{isSetupMode ? t('setupVault') : t('premiumVault')}</h1>
          <p className="mb-6 text-sm text-[var(--color-deep-navy)]/70">
            {t('subtitle')}
          </p>
          
          <div className="flex bg-white/40 p-1 rounded-xl w-full mb-2">
            <button type="button" onClick={() => {setIsSetupMode(false); setShowSetupSecret(false); setSecretKey("");}} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${!isSetupMode ? 'bg-[var(--color-deep-navy)] text-white shadow-sm' : 'text-[var(--color-deep-navy)]/60 hover:bg-white/50'}`}>{t('unlock')}</button>
            <button type="button" onClick={() => {setIsSetupMode(true); setPassword(""); setSecretKey(""); setShowSetupSecret(false);}} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${isSetupMode ? 'bg-[var(--color-deep-navy)] text-white shadow-sm' : 'text-[var(--color-deep-navy)]/60 hover:bg-white/50'}`}>{t('initialize')}</button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {!showSetupSecret ? (
            <div className="relative group">
              <Lock className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${isError ? 'text-red-500/60' : 'text-[var(--color-deep-navy)]/40 group-focus-within:text-[var(--color-sage-green)]'}`} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder={isSetupMode ? t('createMasterPassword') : t('masterPassword')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (isError) setIsError(false);
                }}
                disabled={isDecrypting}
                className={`w-full rounded-xl bg-white/50 py-3.5 pl-11 pr-12 text-sm font-medium outline-none border shadow-inner transition-all disabled:opacity-50 ${isError ? 'border-red-500/50 focus:border-red-500/80 bg-red-50/50 text-red-900' : 'border-white/20 focus:bg-white/80 focus:ring-2 focus:ring-[var(--color-sage-green)]/40'}`}
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
              <KeyRound className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${isError ? 'text-red-500/60' : 'text-[var(--color-deep-navy)]/40 group-focus-within:text-[var(--color-sage-green)]'}`} />
              <input
                type="text"
                placeholder={t('deviceSecretKey')}
                value={secretKey}
                onChange={(e) => {
                  setSecretKey(e.target.value);
                  if (isError) setIsError(false);
                }}
                disabled={isDecrypting}
                className={`w-full rounded-xl bg-white/50 py-3.5 pl-11 pr-4 text-sm font-medium outline-none border shadow-inner transition-all disabled:opacity-50 pass-font ${isError ? 'border-red-500/50 focus:border-red-500/80 bg-red-50/50 text-red-900' : 'border-white/20 focus:bg-white/80 focus:ring-2 focus:ring-[var(--color-sage-green)]/40'}`}
              />
            </div>
          )}

          {isSetupMode && showSetupSecret && !isDecrypting && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="bg-[var(--color-sage-green)]/10 border border-[var(--color-sage-green)]/30 rounded-xl p-4 flex flex-col items-center text-center">
                 <Shield className="w-8 h-8 text-[var(--color-sage-green)] mb-2" />
                 <h3 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t('twoSecretConcept')}</h3>
                 <p className="text-xs opacity-70 mb-3 px-2">
                   {t('twoSecretDesc')}
                 </p>
                 <div className="w-full bg-white/50 rounded-lg p-3 border border-white/40 shadow-inner break-all pass-font text-sm font-bold opacity-80 select-all tracking-wider text-[var(--color-deep-navy)]">
                   {secretKey}
                 </div>
               </div>

               <button
                 type="button"
                 onClick={handleDownloadKit}
                 className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/80 py-3.5 text-sm font-semibold tracking-wide text-[var(--color-deep-navy)] shadow-sm transition-all hover:bg-white active:scale-95 border border-[var(--color-sage-green)]/20 hover:border-[var(--color-sage-green)]/50"
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
                    {progress < 30 ? t('validatingSecrets') : progress < 70 ? t('derivingKey') : t('unlockingVault')}
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--color-deep-navy)]/60">{progress}%</span>
              </div>
              
              {/* Dynamic Sage Green Security Indicator */}
              <div className="flex gap-1 h-3 w-full">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-[var(--color-deep-navy)]/10 overflow-hidden relative shadow-inner">
                    <div 
                      className="absolute inset-y-0 left-0 bg-[var(--color-sage-green)] transition-all duration-300 ease-out"
                      style={{ 
                        width: progress > i * 20 ? (progress > (i + 1) * 20 ? '100%' : `${(progress - (i * 20)) * 5}%`) : '0%',
                        opacity: progress > i * 20 ? 1 : 0.5
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
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-deep-navy)] py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg transition-all hover:bg-[var(--color-deep-navy)]/90 active:scale-95"
            >
              {isSetupMode && !showSetupSecret ? (
                <>{t('generateSecret')} <ChevronRight className="w-4 h-4 opacity-70" /></>
              ) : isSetupMode && showSetupSecret ? (
                <>{t('finalizeVault')} <Lock className="w-4 h-4 opacity-70" /></>
              ) : (
                t('unlockVault')
              )}
            </button>
          )}

          {!isSetupMode && !showSetupSecret && !isDecrypting && (
             <button
               type="button"
               onClick={handlePasskeyAction}
               className="relative mt-2 flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-semibold tracking-wide text-[var(--color-deep-navy)] transition-all bg-white/40 backdrop-blur-[20px] shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 hover:bg-white/60 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] active:scale-95 group overflow-hidden"
             >
               <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
               <Fingerprint className="w-5 h-5 text-[var(--color-sage-green)] group-hover:scale-110 transition-transform" />
               {hasPasskey ? t('biometricsUnlock') : t('biometricsRegister')}
             </button>
          )}

          {isSetupMode && !isDecrypting && (
            <button
              type="button"
              onClick={handleWipe}
              className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-red-500/60 hover:text-red-600 transition-colors text-center"
            >
              {t('factoryResetBtn')}
            </button>
          )}
        </form>
      </div>

      <div className="absolute bottom-8 text-center text-xs font-medium text-[var(--color-deep-navy)]/50 tracking-widest uppercase">
        {t('protectedBy')}
      </div>
    </div>
  );
}
