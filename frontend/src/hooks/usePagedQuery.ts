import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const PAGE_SIZE = 15;
type Q = ReturnType<NonNullable<typeof supabase>['from']>;
export interface PagedOpts { table: string; select: string; filter?: (q: any) => any; order?: string; deps?: unknown[] }

/** Server-side pagination + filtering via PostgREST. Admin RLS policies decide what is readable. */
export function usePagedQuery<T = Record<string, any>>({ table, select, filter, order = 'created_at', deps = [] }: PagedOpts) {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (p = page) => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    let q: any = (supabase.from(table) as Q).select(select, { count: 'exact' });
    if (filter) q = filter(q);
    const { data, count, error } = await q.order(order, { ascending: false }).range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) setError(error.message); else { setError(null); setRows((data ?? []) as T[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [table, select, order, page, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { run(page); }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(0); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return { rows, total, page, setPage, loading, error, reload: () => run(page) };
}
