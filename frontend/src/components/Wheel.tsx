import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

const COLORS = ['#6C5CE7', '#38BDF8', '#F472B6', '#34D399', '#FBBF24', '#8B5CF6', '#FB7185', '#60A5FA', '#A3E635', '#F97316'];
export interface WheelHandle { spinTo: (index: number, ms: number) => Promise<void>; }

const polar = (r: number, deg: number) => { const a = (deg * Math.PI) / 180; return [r * Math.sin(a), -r * Math.cos(a)]; };
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** SVG wheel. The parent decides the winning index (from the server); this component only animates to it. */
export const Wheel = forwardRef<WheelHandle, { names: string[]; highlight?: number | null }>(function Wheel({ names, highlight }, ref) {
  const [rotation, setRotation] = useState(0);
  const [ms, setMs] = useState(0);
  const cur = useRef(0);
  const resolver = useRef<(() => void) | null>(null);
  const n = names.length;
  const seg = 360 / Math.max(n, 1);

  useImperativeHandle(ref, () => ({
    spinTo(index, duration) {
      return new Promise<void>((resolve) => {
        // Land the CENTRE of the winning slice (± a random offset inside the slice) under the top pointer.
        const jitter = (crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff - 0.5) * seg * 0.7;
        const target = (((360 - (index * seg + seg / 2 + jitter)) % 360) + 360) % 360;
        const delta = ((target - (cur.current % 360)) + 360) % 360;
        const next = cur.current + (duration > 0 ? 360 * 6 : 0) + delta;
        cur.current = next;
        resolver.current = resolve;
        setMs(duration); setRotation(next);
        setTimeout(() => { resolver.current?.(); resolver.current = null; }, duration + 150);
      });
    },
  }));

  const r = 96;
  const fs = n > 60 ? 0 : Math.max(4.5, Math.min(9, 150 / n + 3));
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      <svg viewBox="-104 -104 208 208" className="h-full w-full drop-shadow-xl" role="img" aria-label="Wheel">
        <g style={{ transform: `rotate(${rotation}deg)`, transition: ms ? `transform ${ms}ms cubic-bezier(.12,.72,.08,1)` : 'none', transformOrigin: '0 0' }}>
          {n === 0 && <circle r={r} fill="rgb(var(--surface2))" stroke="rgb(var(--line))" />}
          {n === 1 && <circle r={r} fill={COLORS[0]} />}
          {n > 1 && names.map((name, i) => {
            const [x1, y1] = polar(r, i * seg); const [x2, y2] = polar(r, (i + 1) * seg);
            const mid = i * seg + seg / 2;
            return (
              <g key={i} opacity={highlight != null && highlight !== i ? 0.45 : 1}>
                <path d={`M0 0 L${x1} ${y1} A${r} ${r} 0 ${seg > 180 ? 1 : 0} 1 ${x2} ${y2}Z`} fill={COLORS[i % COLORS.length]} stroke="rgb(var(--surface))" strokeWidth="0.8" />
                {fs > 0 && <text transform={`rotate(${mid - 90}) translate(${r - 7},0)`} textAnchor="end" dominantBaseline="middle" fill="#fff" fontSize={fs} fontWeight="700">{trunc(name, n > 24 ? 10 : 16)}</text>}
              </g>);
          })}
          {n === 1 && <text textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="10" fontWeight="700">{trunc(names[0], 18)}</text>}
          <circle r="9" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="1.2" />
        </g>
        <path d="M-7 -104 L7 -104 L0 -88Z" fill="rgb(var(--ink))" stroke="rgb(var(--surface))" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
});
