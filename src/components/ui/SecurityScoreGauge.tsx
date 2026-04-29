export function SecurityScoreGauge({ score, onClick }: { score: number; onClick: () => void }) {
  const radius = 42;
  const dashArray = 2 * Math.PI * radius;
  const dashOffset = dashArray - (dashArray * score) / 100;

  return (
    <button
      onClick={onClick}
      className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-visible rounded-full transition-transform hover:scale-[1.03] active:scale-95"
      aria-label={`Security score: ${score}`}
    >
      <svg
        className="h-full w-full -rotate-90 transform overflow-visible"
        viewBox="0 0 100 100"
        role="presentation"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="7"
          className="entry-divider"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="7"
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
        <span className="text-xl font-bold tracking-tighter text-[var(--color-deep-navy)] dark:text-white">
          {score}
        </span>
        <span className="text-[8px] font-black uppercase opacity-40">Score</span>
      </div>
      <div
        className={`pointer-events-none absolute inset-2 rounded-full opacity-10 ${
          score > 80 ? 'bg-[var(--color-sage-green)]' : 'bg-red-500'
        }`}
      />
    </button>
  );
}
