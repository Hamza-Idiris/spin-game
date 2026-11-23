import type { CSSProperties } from 'react';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BITS = Array.from({ length: 36 }, (_, i) => ({
  left: `${(i * 17 + 8) % 100}%`,
  delay: `${(i % 12) * 0.08}s`,
  dur: `${1.6 + (i % 7) * 0.18}s`,
  color: ['#6C5CE7', '#38BDF8', '#F59E0B', '#10B981', '#F43F5E', '#A78BFA', '#FBBF24'][i % 7],
  w: 6 + (i % 5) * 2,
  h: 10 + (i % 4) * 3,
  dx: `${((i % 9) - 4) * 18}px`,
}));

export function WinnerCelebration({ name, open, onClose, animate }: { name: string; open: boolean; onClose: () => void; animate: boolean }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="winner-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-live="assertive" aria-label={`${t('wheel.congrats')} ${name}`}>
      {animate && BITS.map((b, i) => (
        <span
          key={i}
          className="confetti-bit"
          style={{
            left: b.left,
            animationDelay: b.delay,
            animationDuration: b.dur,
            background: b.color,
            width: b.w,
            height: b.h,
            ['--dx' as string]: b.dx,
          } as CSSProperties}
        />
      ))}
      <div className={`winner-card ${animate ? 'winner-pop' : ''}`} onClick={(e) => e.stopPropagation()}>
        <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-lg">
          <Trophy size={32} />
        </span>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">{t('wheel.congrats')}</p>
        <p className="winner-name">{name}</p>
        <p className="text-sm font-semibold text-muted">{t('wheel.winner')}</p>
        <button className="btn btn-primary mt-2 !px-8" onClick={onClose}>{t('common.close')}</button>
      </div>
    </div>
  );
}
