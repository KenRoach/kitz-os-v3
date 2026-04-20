type Props = {
  credits: number;
  lifetimeTopup: number;
};

export default function TopNavBattery({ credits, lifetimeTopup }: Props) {
  const max = Math.max(lifetimeTopup, 1);
  const ratio = Math.min(Math.max(credits / max, 0), 1);
  const fillPercent = Math.max(ratio * 100, credits > 0 ? 8 : 0);
  const low = credits < max * 0.15;

  return (
    <div
      title={`${credits} créditos IA · ${Math.round(ratio * 100)}% de ${lifetimeTopup}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0 1rem',
        borderLeft: '1px solid var(--kitz-line-strong)',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'relative',
          width: '2.75rem',
          height: '1.1rem',
          border: `2px solid ${low ? 'var(--kitz-error)' : 'var(--kitz-text-strong)'}`,
          padding: '2px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${fillPercent}%`,
            background: low ? 'var(--kitz-error)' : 'var(--kitz-text-strong)',
            transition: 'width 0.4s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '-3px',
            top: '3px',
            width: '2px',
            height: '6px',
            background: low ? 'var(--kitz-error)' : 'var(--kitz-text-strong)',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: low ? 'var(--kitz-error)' : 'var(--kitz-text-strong)',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}
      >
        {credits} cr
      </span>
    </div>
  );
}
