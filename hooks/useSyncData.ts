import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { slugifyOrg } from '@/lib/utils/org';

interface FetchOptions {
  enabled?: boolean;
}

/**
 * Fetch all documents from a Supabase table, filtered by the current user's org.
 */
export function useCollection(
  collectionName: string,
  orgId: string | null | undefined,
  options?: FetchOptions
) {
  const { enabled = true } = options || {};
  const sluggedOrg = orgId ? slugifyOrg(orgId) : null;

  const { data, error, isLoading, mutate } = useSWR(
    enabled && sluggedOrg ? [`collection:${collectionName}:${sluggedOrg}`] : null,
    async () => {
      const { data, error } = await supabase
        .from(collectionName)
        .select('*')
        .eq('orgId', sluggedOrg)
        .eq('isDeleted', false)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error(`[Fetch] Failed to fetch ${collectionName}:`, {
          message: error.message,
          code: error.code,
          details: error.details,
          orgId: sluggedOrg
        });
        throw error;
      }
      return data || [];
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry on 404 errors (table doesn't exist)
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          return;
        }
        // Retry up to 3 times for other errors
        if (retryCount < 3) revalidate({ retryCount });
      },
    }
  );

  return {
    data: data || [],
    error,
    isLoading,
    mutate,
  };
}

/**
 * Fetch a single document from Supabase by ID.
 */
export function useDocument(
  collectionName: string,
  documentId: string | null,
  options?: FetchOptions
) {
  const { enabled = true } = options || {};

  const { data, error, isLoading, mutate } = useSWR(
    enabled && documentId ? [`doc:${collectionName}:${documentId}`] : null,
    async () => {
      const { data, error } = await supabase
        .from(collectionName)
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) {
        console.error(`[DB] Failed to fetch document ${documentId}:`, error.message);
        return null;
      }
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry on 404 errors (table doesn't exist)
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          return;
        }
        // Retry up to 3 times for other errors
        if (retryCount < 3) revalidate({ retryCount });
      },
    }
  );

  return { data: data || null, error, isLoading, mutate };
}

/**
 * Fetch all documents from a collection with optional filter and sort.
 */
export function useFilteredCollection(
  collectionName: string,
  orgId: string | null | undefined,
  filter?: (item: any) => boolean,
  sortFn?: (a: any, b: any) => number,
  options?: FetchOptions
) {
  const { data, error, isLoading, mutate } = useCollection(collectionName, orgId, options);

  const filtered = data
    ? data.filter(filter || (() => true)).sort(sortFn || (() => 0))
    : [];

  return { data: filtered, error, isLoading, mutate };
}

// Kept for backward compatibility
export function useRefetch(_collectionName: string, _documentId?: string | null) {
  return async () => {};
}
