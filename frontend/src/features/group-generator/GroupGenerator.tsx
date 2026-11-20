import { useState } from 'react';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToolShell } from '../../components/ToolShell';
import { ParticipantsPanel } from '../../components/ParticipantsPanel';
import { GroupSettings, type GroupCfg } from '../../components/GroupSettings';
import { GroupCards } from '../../components/ResultView';
import { ResultActions } from '../../components/ResultActions';
import { useParticipants } from '../../hooks/useParticipants';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { completeSpin, runSpin } from '../../lib/spinService';
import { errorText } from '../../lib/anim';
import type { HistoryRecord } from '../../types';

export default function GroupGenerator() {
  const { t } = useTranslation();
  const toast = useToast();
  const { settings } = useSettings();
  const p = useParticipants(false);
  const [cfg, setCfg] = useState<GroupCfg>({ mode: 'size', value: 4 });
  const [rec, setRec] = useState<HistoryRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (p.names.length < 1) { toast('error', t('groups.needOne')); return; }
    setBusy(true);
    try { const r = await runSpin('groups', p.names, cfg, settings.system); setRec(r); completeSpin(r); }
    catch (e) { toast('error', errorText(e, t)); } finally { setBusy(false); }
  };
  return (
    <ToolShell tool="groups">
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <ParticipantsPanel p={p} />
          <GroupSettings cfg={cfg} onChange={setCfg} total={p.names.length} />
          <button className="btn btn-primary w-full" disabled={busy || p.names.length < 1} onClick={generate}><Users size={16} />{t('groups.generate')}</button>
        </div>
        <div className="space-y-4">
          {!rec && <div className="card grid min-h-[260px] place-items-center p-8 text-center text-muted">{t('input.empty')}</div>}
          {rec && (<><ResultActions rec={rec} onRegenerate={generate} onReset={() => setRec(null)} /><GroupCards groups={rec.output.groups!} /></>)}
        </div>
      </div>
    </ToolShell>
  );
}
