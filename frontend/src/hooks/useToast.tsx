import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: Kind; text: string }
const Ctx = createContext<(kind: Kind, text: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3800);
  }, []);
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };
  const color = { success: 'text-emerald-500', error: 'text-red-500', info: 'text-accent' };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {items.map((t) => { const I = Icon[t.kind]; return (
          <div key={t.id} className="reveal card pointer-events-auto flex max-w-sm items-center gap-2.5 px-4 py-3 text-sm">
            <I size={18} className={color[t.kind]} /> <span>{t.text}</span>
          </div>); })}
      </div>
    </Ctx.Provider>
  );
}
