import { ShieldCheck } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

type SecurityScoreTier = 'critical' | 'warning' | 'safe' | 'excellent';

interface SecurityScoreGaugeProps {
  score: number;
  onClick?: () => void;
  className?: string;
  size?: 'compact' | 'hero';
}

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score || 0)));

const getTier = (score: number): SecurityScoreTier => {
  if (score < 40) return 'critical';
  if (score < 70) return 'warning';
  if (score < 90) return 'safe';
  return 'excellent';
};

export function SecurityScoreGauge({
  score,
  onClick,
  className = '',
  size = 'compact',
}: SecurityScoreGaugeProps) {
  const { t } = useTranslation();
  const gradientId = `securityGaugeGradient-${useId().replace(/:/g, '')}`;
  const safeScore = clampScore(score);
  const tier = getTier(safeScore);
  const isInteractive = Boolean(onClick);
  const status =
    tier === 'critical'
      ? t('securityGaugeWeak', 'Weak')
      : tier === 'warning'
        ? t('securityGaugeNeedsWork', 'Improve')
        : tier === 'safe'
          ? t('securityGaugeProtected', 'Protected')
          : t('securityGaugeExcellent', 'Excellent');
  const action =
    tier === 'excellent'
      ? t('securityGaugeSafeAction', 'Safe')
      : t('securityGaugeStrengthenAction', 'Strengthen');
  const ringProgress = `${safeScore} 100`;
  const meterStyle = { '--security-score': `${safeScore}%` } as CSSProperties & {
    '--security-score': string;
  };
  const content = (
    <>
      <div className="security-score-gauge-ring" aria-hidden="true">
        <svg viewBox="0 0 44 44" role="presentation" focusable="false">
          <defs>
            <linearGradient id={gradientId} x1="6" y1="38" x2="38" y2="6">
              {tier === 'critical' ? (
                <>
                  <stop offset="0%" stopColor="#b91c1c" />
                  <stop offset="100%" stopColor="#fb7185" />
                </>
              ) : tier === 'warning' ? (
                <>
                  <stop offset="0%" stopColor="#b7791f" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </>
              ) : tier === 'safe' ? (
                <>
                  <stop offset="0%" stopColor="#789179" />
                  <stop offset="100%" stopColor="#a9c6a7" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#7fa17c" />
                  <stop offset="100%" stopColor="#36d399" />
                </>
              )}
            </linearGradient>
          </defs>
          <circle className="security-score-gauge-track" cx="22" cy="22" r="18" pathLength={100} />
          <circle
            className="security-score-gauge-progress"
            cx="22"
            cy="22"
            r="18"
            pathLength={100}
            strokeDasharray={ringProgress}
            stroke={`url(#${gradientId})`}
          />
        </svg>
        <strong>{safeScore}</strong>
      </div>
      <div className="security-score-gauge-copy">
        <span className="security-score-gauge-label">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('securityGaugeScore', 'Score')}
        </span>
        <strong>{status}</strong>
        <span>{action}</span>
      </div>
      <div className="security-score-gauge-meter" aria-hidden="true" style={meterStyle}>
        <span />
      </div>
    </>
  );

  const baseClass = `security-score-gauge security-score-gauge-${tier} security-score-gauge-${size} ${className}`;

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={baseClass}
        aria-label={t('securityGaugeAria', 'Security score {{score}}: {{status}}', {
          score: safeScore,
          status,
        })}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={baseClass}
      role="img"
      aria-label={t('securityGaugeAria', 'Security score {{score}}: {{status}}', {
        score: safeScore,
        status,
      })}
    >
      {content}
    </div>
  );
}
