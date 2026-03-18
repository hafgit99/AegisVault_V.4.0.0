import { useState, useEffect, useCallback, useRef } from "react";
import { Copy, Check, ShieldCheck } from "lucide-react";
import { generateTOTP, getRemainingSeconds, type TOTPParams } from "../../lib/TOTPService";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

interface TOTPWidgetProps {
  totpSecret: string;
  issuer?: string;
  algorithm?: TOTPParams["algorithm"];
  digits?: number;
  period?: number;
}

/**
 * TOTPWidget — Gerçek zamanlı TOTP kodu göstergesi.
 * 30 saniye geri sayım, dairesel progress ve kopyalama özelliği.
 */
export function TOTPWidget({
  totpSecret,
  issuer = "",
  algorithm = "SHA-1",
  digits = 6,
  period = 30,
}: TOTPWidgetProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(getRemainingSeconds(period));
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshCode = useCallback(async () => {
    try {
      const params: TOTPParams = {
        secret: totpSecret,
        issuer,
        account: "",
        algorithm,
        digits,
        period,
      };
      const newCode = await generateTOTP(params);
      setCode(newCode);
    } catch {
      setCode("ERROR");
    }
  }, [totpSecret, issuer, algorithm, digits, period]);

  useEffect(() => {
    const firstTick = window.setTimeout(() => {
      void refreshCode();
    }, 0);

    intervalRef.current = setInterval(() => {
      const rem = getRemainingSeconds(period);
      setRemaining(rem);

      // Yeni periyotta kodu yenile
      if (rem === period || rem === period - 1) {
        void refreshCode();
      }
    }, 1000);

    return () => {
      window.clearTimeout(firstTick);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshCode, period]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t("totpCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  // Dairesel progress yüzdesi
  const progress = (remaining / period) * 100;
  const isLow = remaining <= 5;

  // Kodu gruplara ayır (6 → 3+3, 8 → 4+4)
  const formattedCode =
    code.length === 6
      ? `${code.slice(0, 3)} ${code.slice(3)}`
      : code.length === 8
      ? `${code.slice(0, 4)} ${code.slice(4)}`
      : code;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
        isLow
          ? "totp-status-alert animate-pulse"
          : "bg-[var(--color-sage-green)]/10 border border-[var(--color-sage-green)]/30"
      }`}
    >
      {/* Circular Timer */}
      <div className="relative w-8 h-8 shrink-0">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-black/5" />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={2 * Math.PI * 16}
            strokeDashoffset={2 * Math.PI * 16 * (1 - progress / 100)}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-linear ${
              isLow ? "text-red-500" : "text-[var(--color-sage-green)]"
            }`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[9px] font-bold ${isLow ? "text-red-500" : "text-[var(--color-deep-navy)]"}`}>
            {remaining}
          </span>
        </div>
      </div>

      {/* TOTP Code */}
      <div className="flex flex-col">
        <span className="text-[9px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-1">
          <ShieldCheck className="w-2.5 h-2.5" /> 2FA {issuer && `• ${issuer}`}
        </span>
        <span
          className={`font-mono text-lg font-bold tracking-[0.3em] select-all transition-colors ${
            isLow ? "text-red-600" : "text-[var(--color-deep-navy)]"
          }`}
        >
          {formattedCode}
        </span>
      </div>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className={`ml-auto p-2 rounded-lg transition-all ${
          copied
            ? "bg-[var(--color-sage-green)] text-white scale-110"
            : "totp-btn-secondary"
        }`}
        title={t("copyTOTP")}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
