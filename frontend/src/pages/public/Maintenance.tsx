import { Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export default function Maintenance() {
  const { t } = useTranslation();
  return <div className="grid min-h-[60vh] place-items-center px-4 text-center"><div><span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Wrench size={26} /></span><h1 className="text-2xl font-extrabold">{t('maintenance.title')}</h1><p className="mt-2 text-muted">{t('maintenance.text')}</p></div></div>;
}
