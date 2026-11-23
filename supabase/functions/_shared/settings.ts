// Server-side validation of website settings.
type V = (x: unknown) => boolean;
const str = (max: number, min = 0): V => (x) => typeof x === 'string' && x.length >= min && x.length <= max;
const bool: V = (x) => typeof x === 'boolean';
const int = (lo: number, hi: number): V => (x) => Number.isInteger(x) && (x as number) >= lo && (x as number) <= hi;
const url: V = (x) => typeof x === 'string' && (x === '' || (x.length < 500 && /^https:\/\//.test(x)));
const oneOf = (...o: string[]): V => (x) => typeof x === 'string' && o.includes(x);
const hex: V = (x) => typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x);

export const SETTINGS_SPEC: Record<string, Record<string, V>> = {
  general: { name: str(60, 1), logoUrl: url, faviconUrl: url, description: str(200), headline: str(80, 1), subtitle: str(160) },
  tools: { wheel: bool, teams: bool, groups: bool },
  appearance: { defaultTheme: oneOf('system', 'light', 'dark'), allowLight: bool, allowDark: bool, primaryColor: hex },
  features: { sound: bool, animations: bool, excel: bool, pdf: bool },
  system: {
    maintenance: bool, activityRetentionDays: int(0, 3650), sessionRetentionDays: int(0, 3650),
    resultsRetentionDays: int(0, 3650), maxParticipants: int(2, 5000), maxNameLength: int(1, 200),
  },
};

export function validateSetting(key: string, value: unknown): string | null {
  const spec = SETTINGS_SPEC[key];
  if (!spec) return 'unknown_key';
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'invalid_value';
  const v = value as Record<string, unknown>;
  for (const k of Object.keys(v)) if (!(k in spec)) return `unknown_field:${k}`;
  for (const [k, check] of Object.entries(spec)) if (!check(v[k])) return `invalid_field:${k}`;
  if (key === 'appearance' && !v.allowLight && !v.allowDark) return 'invalid_field:allowLight';
  return null;
}
