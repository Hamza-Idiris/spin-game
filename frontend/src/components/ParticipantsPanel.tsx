import { useRef, useState } from 'react';
import { Check, FileUp, Pencil, Plus, Trash2, X, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { useParticipants } from '../hooks/useParticipants';
import { useToast } from '../hooks/useToast';

const SAMPLE = ['Amina', 'Hodan', 'Abdi', 'Farah', 'Ayaan', 'Mohamed', 'Sagal', 'Yusuf', 'Ilhan', 'Omar', 'Hibo', 'Liban'];

export function ParticipantsPanel({ p, placeholder, disabled, label }: { p: ReturnType<typeof useParticipants>; placeholder?: string; disabled?: boolean; label?: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const report = (r: ReturnType<typeof p.addText>) => {
    if (r.duplicates) toast('info', t('input.duplicates', { count: r.duplicates }));
    if (r.truncated) toast('info', t('input.tooLong', { max: 80 }));
    if (r.overLimit) toast('error', t('input.limit', { max: p.max }));
  };
  const add = () => { if (!text.trim()) return; report(p.addText(text)); setText(''); };

  const importCsv = async (f: File) => {
    const raw = await f.text();
    const lines = raw.split(/\r?\n/).map((l) => l.split(',')[0].replace(/^"|"$/g, '').trim()).filter(Boolean);
    if (lines.length && /^(names?|participants?|teams?|magac)$/i.test(lines[0])) lines.shift();
    const r = p.addText(lines.join('\n')); report(r);
    toast('success', t('input.imported', { count: r.added }));
  };

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{label ?? t('report.participants')}</h2>
        <span className="badge bg-primary/10 text-primary" aria-live="polite">{t('input.count', { count: p.names.length })}</span>
      </div>
      <textarea className="input min-h-[84px] resize-y" disabled={disabled} value={text} rows={3}
        placeholder={`${placeholder ?? t('input.placeholder')}\n${t('input.paste')}`}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } }}
        onPaste={(e) => { const v = e.clipboardData.getData('text'); if (/[\n\r,;\t]/.test(v)) { e.preventDefault(); report(p.addText(v)); } }} />
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm" disabled={disabled || !text.trim()} onClick={add}><Plus size={15} />{t('input.addAll')}</button>
        <button className="btn btn-sm" disabled={disabled} onClick={() => file.current?.click()}><FileUp size={15} />{t('input.importCsv')}</button>
        <input ref={file} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ''; }} />
        {p.names.length === 0 && <button className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => report(p.addText(SAMPLE.join('\n')))}><Sparkles size={15} />{t('input.sample')}</button>}
        {p.names.length > 0 && <button className="btn btn-ghost btn-sm ms-auto text-red-500" disabled={disabled} onClick={p.clear}><Trash2 size={15} />{t('common.clear')}</button>}
      </div>
      <div className="mt-4 flex max-h-56 flex-wrap gap-2 overflow-auto" aria-label={t('report.participants')}>
        {p.names.length === 0 && <p className="text-sm text-muted">{t('input.empty')}</p>}
        {p.names.map((n, i) => editing === i ? (
          <span key={i} className="chip !p-1">
            <input autoFocus className="input !w-32 !py-1" value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { p.edit(i, draft); setEditing(null); } if (e.key === 'Escape') setEditing(null); }} aria-label={t('input.editPrompt')} />
            <button className="btn btn-ghost !p-1" onClick={() => { p.edit(i, draft); setEditing(null); }} aria-label={t('common.save')}><Check size={14} /></button>
            <button className="btn btn-ghost !p-1" onClick={() => setEditing(null)} aria-label={t('common.cancel')}><X size={14} /></button>
          </span>
        ) : (
          <span key={i} className="chip reveal" style={{ animationDelay: `${Math.min(i, 20) * 15}ms` }}>
            <span className="max-w-[10rem] truncate">{n}</span>
            <button disabled={disabled} className="text-muted transition hover:text-primary" onClick={() => { setEditing(i); setDraft(n); }} aria-label={`${t('common.edit')} ${n}`}><Pencil size={13} /></button>
            <button disabled={disabled} className="text-muted transition hover:text-red-500" onClick={() => p.remove(i)} aria-label={`${t('common.remove')} ${n}`}><X size={14} /></button>
          </span>))}
      </div>
    </div>
  );
}
