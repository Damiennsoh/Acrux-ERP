import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FetchOptions {
  enabled?: boolean;
  /** Max ms to wait before giving up (default: 10000) */
  timeoutMs?: number;
}

/**
 * Wraps a Supabase query with a hard timeout so the UI never spins forever
 * if the network is offline or Supabase is unreachable.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`[${label}] Request timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Hook to fetch data from Supabase (online-first).
 * Falls back gracefully to an empty list when offline or when the
 * request stalls, so the UI never spins indefinitely.
 */
export function useSupabaseCollection(
  tableName: string,
  options?: FetchOptions
) {
  const { enabled = true, timeoutMs = 10000 } = options || {};
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    // Fast-fail when the browser reports it is offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setData([]);
      setError(new Error('Offline'));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const query = supabase.from(tableName).select('*');
      const { data: result, error: fetchError } = await withTimeout(
        query,
        timeoutMs,
        tableName
      );

      if (fetchError) throw fetchError;
      setData(result || []);
    } catch (err: any) {
      console.warn(`[useSupabaseCollection:${tableName}]`, err?.message || err);
      setError(err as Error);
      // Keep existing data on re-fetch failures so the table doesn't blank out
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, enabled]);

  return {
    data,
    error,
    isLoading,
    mutate: fetchData,
  };
}
