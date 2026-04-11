/**
 * SecurityScoreGauge — SVG dairesel güvenlik skoru göstergesi.
 * Watchtower skorunu görselleştirir: yeşil (>80), amber (>50), kırmızı (≤50).
 */
// @ts-nocheck

export function SecurityScoreGauge({ score, onClick }: { score: number; onClick: () => void }) {
  const dashArray = 2 * Math.PI * 45;
  const dashOffset = dashArray - (dashArray * score) / 100;

  return (
    <button
      onClick={onClick}
      className="group relative flex items-center justify-center w-24 h-24 transition-transform hover:scale-110 active:scale-95"
      aria-label={`Security score: ${score}`}
    >
      <svg className="w-full h-full -rotate-90 transform">
        <circle
          cx="48"
          cy="48"
          r="45"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="6"
          className="entry-divider"
        />
        <circle
          cx="48"
          cy="48"
          r="45"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={dashArray}
          style={{ strokeDashoffset: dashOffset }}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${
            score > 80
              ? 'text-[var(--color-sage-green)]'
              : score > 50
                ? 'text-amber-500'
                : 'text-red-500'
          }`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tracking-tighter text-[var(--color-deep-navy)]">
          {score}
        </span>
        <span className="text-[8px] uppercase font-black opacity-40">Score</span>
      </div>
      <div
        className={`absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none ${
          score > 80 ? 'bg-[var(--color-sage-green)]' : 'bg-red-500'
        }`}
        style={{ animationDuration: '3s' }}
      />
    </button>
  );
}
