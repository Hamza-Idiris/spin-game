import type { SiteSettings } from '../types';
export const DEFAULT_SETTINGS: SiteSettings = {
  general: { name: 'SPIN', logoUrl: '', faviconUrl: '', description: 'Spin, select, match, and create groups effortlessly.', headline: '', subtitle: '' },
  tools: { wheel: true, teams: true, groups: true },
  appearance: { defaultTheme: 'system', allowLight: true, allowDark: true, primaryColor: '#6C5CE7' },
  features: { sound: true, animations: true, excel: true, pdf: true },
  system: { maintenance: false, activityRetentionDays: 365, sessionRetentionDays: 365, resultsRetentionDays: 0, maxParticipants: 500, maxNameLength: 80 },
};
