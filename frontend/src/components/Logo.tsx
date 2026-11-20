import { useSettings } from '../hooks/useSettings';
export function Logo({ size = 32 }: { size?: number }) {
  const { settings } = useSettings();
  const g = settings.general;
  return (
    <span className="inline-flex items-center gap-2.5 font-extrabold tracking-tight">
      {g.logoUrl ? <img src={g.logoUrl} alt="" style={{ height: size }} className="rounded-lg" /> : (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="rgb(var(--primary))" /><stop offset="1" stopColor="rgb(var(--accent))" /></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#lg)" /><path d="M32 12a20 20 0 1 0 20 20" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" /><circle cx="32" cy="32" r="5" fill="#fff" /></svg>)}
      <span className="text-lg">{g.name || 'SPIN'}</span>
    </span>
  );
}
