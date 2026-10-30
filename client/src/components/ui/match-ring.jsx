import clsx from 'clsx';
import { matchTier } from '@/lib/match-tier.js';

/** Circular percentage indicator coloured by match tier. */
export function MatchRing({ score, size = 52, showLabel = false, className }) {
  const tier = matchTier(score);
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div
      className={clsx('inline-flex flex-col items-center gap-1', className)}
      data-tier={tier.key}
      role="img"
      aria-label={`${score}% match, ${tier.label}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-200" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - score / 100)}
            className={tier.stroke}
          />
        </svg>
        <span
          className={clsx(
            'absolute inset-0 flex items-center justify-center font-display text-xs font-semibold',
            tier.text,
          )}
        >
          {score}%
        </span>
      </div>
      {showLabel && <span className={clsx('text-xs font-semibold', tier.text)}>{tier.label}</span>}
    </div>
  );
}
