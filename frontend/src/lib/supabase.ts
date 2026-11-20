import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True only when real Supabase credentials are configured. Nothing pretends to be connected otherwise. */
export const isConfigured = Boolean(url && key && !url.includes('YOUR-PROJECT'));
export const supabase: SupabaseClient | null = isConfigured ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export async function callFunction<T = unknown>(name: string, body: unknown, opts: { auth?: boolean; keepalive?: boolean } = {}): Promise<T> {
  if (!isConfigured || !supabase) throw new Error('not_configured');
  let token = key!;
  if (opts.auth) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('not_authenticated');
    token = data.session.access_token;
  }
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST', keepalive: opts.keepalive,
    headers: { 'Content-Type': 'application/json', apikey: key!, Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error((data as { error?: string }).error ?? `http_${res.status}`) as Error & { data?: unknown }; e.data = data; throw e; }
  return data as T;
}
