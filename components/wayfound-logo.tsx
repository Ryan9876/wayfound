export function WayfoundMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 24H16.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 17H27" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M4 10H16.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10 26V20.5C10 18.57 11.57 17 13.5 17H18.5C20.43 17 22 15.43 22 13.5V8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="20.2" y="3.8" width="3.6" height="3.6" rx="0.8" fill="currentColor" />
    </svg>
  );
}

export function WayfoundLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <span className="brand-mark"><WayfoundMark size={30} /></span>
      {!compact && (
        <span className="brand-copy">
          <strong>Wayfound</strong>
          <small>Know the next step.</small>
        </span>
      )}
    </div>
  );
}
