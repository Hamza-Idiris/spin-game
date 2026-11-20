import type { SpinConfig, SpinOutput, Tool } from '../lib/shared/engine';
export type { SpinConfig, SpinOutput, Tool, Match } from '../lib/shared/engine';

export interface HistoryRecord {
  id: string;                 // local id
  serverId?: string;          // spin_results.id when stored centrally
  tool: Tool;
  createdAt: string;
  participants: string[];
  config: SpinConfig;
  output: SpinOutput;
  local?: boolean;            // true when generated locally (server unreachable)
}

export interface SiteSettings {
  general: { name: string; logoUrl: string; faviconUrl: string; description: string; headline: string; subtitle: string };
  tools: Record<Tool, boolean>;
  appearance: { defaultTheme: 'system' | 'light' | 'dark'; allowLight: boolean; allowDark: boolean; primaryColor: string };
  features: { sound: boolean; animations: boolean; excel: boolean; pdf: boolean };
  system: { maintenance: boolean; activityRetentionDays: number; sessionRetentionDays: number; resultsRetentionDays: number; maxParticipants: number; maxNameLength: number };
}
