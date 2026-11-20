import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface AdminCtx { id: string; email: string | null }

/** Verifies the bearer JWT and that the user exists in admin_users. Returns null if not an admin. */
export async function requireAdmin(req: Request, db: SupabaseClient): Promise<AdminCtx | null> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: row } = await db.from('admin_users').select('id').eq('id', data.user.id).maybeSingle();
  return row ? { id: data.user.id, email: data.user.email ?? null } : null;
}

export async function logSystemError(db: SupabaseClient, source: string, err: unknown, details: Record<string, unknown> = {}) {
  try {
    await db.from('system_errors').insert({ source, message: String((err as Error)?.message ?? err).slice(0, 500), details });
  } catch { /* never throw from error logging */ }
}
