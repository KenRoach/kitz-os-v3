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
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'relative',
          width: '2.25rem',
          height: '0.875rem',
          border: `1.5px solid ${low ? 'var(--kitz-error)' : 'var(--kitz-text-strong)'}`,
          padding: '1px',
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
          fontSize: '0.7rem',
          color: low ? 'var(--kitz-error)' : 'var(--kitz-text)',
          whiteSpace: 'nowrap',
        }}
      >
        {credits} cr
      </span>
    </div>
  );
}
