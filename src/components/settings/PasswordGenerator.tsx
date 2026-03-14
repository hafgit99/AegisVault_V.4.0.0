import { useState, useEffect, useMemo, useCallback } from "react";
import { Wand2, Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export function PasswordGenerator({ isOpen }: { isOpen: boolean }) {
  const { t } = useTranslation();
  const [genLength, setGenLength] = useState(18);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [standalonePassword, setStandalonePassword] = useState("");
  const [isStandaloneCopied, setIsStandaloneCopied] = useState(false);

  const calculateEntropy = (len: number, num: boolean, sym: boolean) => {
    let pool = 52;
    if (num) pool += 10;
    if (sym) pool += 33;
    return Math.round(len * Math.log2(pool));
  };

  const genEntropy = useMemo(
    () => calculateEntropy(genLength, genNumbers, genSymbols),
    [genLength, genNumbers, genSymbols]
  );

  const handleGenerateStandalone = useCallback(() => {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    if (genNumbers) chars += "0123456789";
    if (genSymbols) chars += "!@#$%^&*()_+=-~[]{}|;:,.<>?";
    const arr = new Uint32Array(genLength);
    window.crypto.getRandomValues(arr);
    setStandalonePassword(Array.from(arr).map((n) => chars[n % chars.length]).join(""));
  }, [genLength, genNumbers, genSymbols]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      handleGenerateStandalone();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, handleGenerateStandalone]);

  const copyStandalonePassword = () => {
    navigator.clipboard.writeText(standalonePassword);
    setIsStandaloneCopied(true);
    toast.success(t("copiedClipboard"));
    setTimeout(() => setIsStandaloneCopied(false), 2000);
  };

  return (
    <div className="password-generator-surface border border-[var(--color-sage-green)]/30 bg-gradient-to-br from-[var(--color-sage-green)]/5 to-transparent rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col gap-6">
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20 pointer-events-none overflow-hidden">
        <div className="w-[200%] h-full flex" style={{ transform: `translateX(-${genEntropy % 50}%)` }}>
          <svg className={`w-full h-full fill-[var(--color-sage-green)] ${genEntropy > 60 ? "animate-wave-fast" : "animate-wave"}`} viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path d="M0,160L40,170.7C80,181,160,203,240,192C320,181,400,139,480,133.3C560,128,640,160,720,181.3C800,203,880,213,960,197.3C1040,181,1120,139,1200,112C1280,85,1360,75,1400,69.3L1440,64L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"></path>
          </svg>
        </div>
      </div>
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-[var(--color-sage-green)]" />
          <h3 className="text-lg font-semibold tracking-tight">{t("advancedGenTitle")}</h3>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-md ${genEntropy > 80 ? "bg-[var(--color-sage-green)]/20 text-[var(--color-sage-green)]" : "bg-red-500/10 text-red-500"}`}>
          {t("entropyLabel", { entropy: genEntropy })}
        </span>
      </div>
      <div className="password-generator-output flex items-center justify-between bg-white/70 rounded-xl p-4 border border-[var(--color-sage-green)]/20 shadow-inner relative z-10">
        <span className="pass-font text-lg font-semibold text-[var(--color-deep-navy)] tracking-widest truncate mr-3 select-all">{standalonePassword}</span>
        <div className="flex gap-2">
          <button onClick={handleGenerateStandalone} className="password-generator-btn p-2.5 rounded-lg bg-white/80 hover:bg-white text-[var(--color-deep-navy)] hover:text-[var(--color-sage-green)] transition-all shadow active:scale-95" title={t("regenerateBtn")}>
            <Wand2 className="w-5 h-5" />
          </button>
          <button onClick={copyStandalonePassword} className={`password-generator-btn p-2.5 rounded-lg transition-all shadow ${isStandaloneCopied ? "bg-[var(--color-sage-green)] text-white scale-110" : "bg-white/80 hover:bg-white hover:text-[var(--color-sage-green)]"}`} title={t("copyPasswordBtn")}>
            {isStandaloneCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold opacity-70">{t("lengthLabel")}: <span className="text-[var(--color-sage-green)]">{genLength}</span></label>
          <input type="range" min="8" max="64" value={genLength} onChange={(e) => setGenLength(parseInt(e.target.value))} className="w-full accent-[var(--color-sage-green)]" />
        </div>
        <div className="password-generator-toggle flex items-center justify-between md:justify-center gap-3 bg-white/40 p-3 rounded-xl border border-white">
          <label className="text-sm font-semibold opacity-70">{t("numbersLabel")}</label>
          <input type="checkbox" checked={genNumbers} onChange={(e) => setGenNumbers(e.target.checked)} className="accent-[var(--color-sage-green)] w-5 h-5 rounded cursor-pointer" />
        </div>
        <div className="password-generator-toggle flex items-center justify-between md:justify-center gap-3 bg-white/40 p-3 rounded-xl border border-white">
          <label className="text-sm font-semibold opacity-70">{t("symbolsLabel")}</label>
          <input type="checkbox" checked={genSymbols} onChange={(e) => setGenSymbols(e.target.checked)} className="accent-[var(--color-sage-green)] w-5 h-5 rounded cursor-pointer" />
        </div>
      </div>
    </div>
  );
}
