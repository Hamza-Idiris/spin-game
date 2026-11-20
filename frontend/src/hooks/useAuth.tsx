import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { callFunction, supabase } from '../lib/supabase';

interface Ctx { session: Session | null; isAdmin: boolean; loading: boolean; signIn: (e: string, p: string) => Promise<'ok' | 'invalid' | 'not_admin'>; signOut: () => Promise<void> }
const AuthCtx = createContext<Ctx>({ session: null, isAdmin: false, loading: true, signIn: async () => 'invalid', signOut: async () => {} });
export const useAuth = () => useContext(AuthCtx);

async function checkAdmin(userId: string): Promise<boolean> {
  if (!supabase) return false;
  // RLS lets a user read only their own admin_users row; the same check is enforced again server-side on every admin action.
  const { data } = await supabase.from('admin_users').select('id').eq('id', userId).maybeSingle();
  return Boolean(data);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setIsAdmin(data.session ? await checkAdmin(data.session.user.id) : false);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setIsAdmin(false);
      else setTimeout(async () => setIsAdmin(await checkAdmin(s.user.id)), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback<Ctx['signIn']>(async (email, password) => {
    if (!supabase) return 'invalid';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return 'invalid';
    if (!(await checkAdmin(data.user.id))) { await supabase.auth.signOut(); return 'not_admin'; }
    setIsAdmin(true);
    callFunction('admin-api', { action: 'log_auth', event: 'login' }, { auth: true }).catch(() => {});
    return 'ok';
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await callFunction('admin-api', { action: 'log_auth', event: 'logout' }, { auth: true }).catch(() => {});
    await supabase.auth.signOut();
  }, []);

  return <AuthCtx.Provider value={{ session, isAdmin, loading, signIn, signOut }}>{children}</AuthCtx.Provider>;
}
