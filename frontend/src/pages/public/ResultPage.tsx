import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getHistory } from '../../lib/history';
import { ResultView } from '../../components/ResultView';
import { ResultActions } from '../../components/ResultActions';

export default function ResultPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const rec = id ? getHistory(id) : null;
  return (
    <div className="page-in mx-auto max-w-6xl px-4 py-8">
      <Link to="/tools" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={16} className="rtl:rotate-180" />{t('common.back')}</Link>
      {!rec ? <div className="card p-10 text-center text-muted">{t('history.notFound')}</div> : (
        <div className="space-y-5">
          <div><h1 className="text-2xl font-extrabold">{t(`tools.${rec.tool}.name`)}</h1><p className="text-sm text-muted">{new Date(rec.createdAt).toLocaleString(i18n.language)}</p></div>
          <ResultActions rec={rec} />
          <ResultView rec={rec} />
        </div>)}
    </div>
  );
}
