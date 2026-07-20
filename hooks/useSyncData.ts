import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getFromLocal, getAllFromLocal, getAuthSession } from '@/lib/indexeddb';
import { slugifyOrg } from '@/lib/utils/org';
import { supabase } from '@/lib/supabase';


interface FetchOptions {
  forceRemote?: boolean;
  cacheTime?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch a single document from IndexedDB
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
      try {
        const session = await getAuthSession();
        let userOrg = null;
        if (session && session.user?.user_metadata?.organizationName) {
           userOrg = session.user.user_metadata.organizationName;
        }

        const doc = await getFromLocal(collectionName, documentId as string);
        if (!doc) return null;
        
        // Ensure isolation locally
        if (userOrg && doc.orgId && doc.orgId !== userOrg) return null;
        if (userOrg && doc.org_id && doc.org_id !== userOrg) return null;

        return doc;
      } catch (err) {
        throw err;
      }
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    data: data || null,
    error,
    isLoading,
    mutate,
  };
}

/**
 * Hook to fetch all documents from a collection from IndexedDB
 */
export function useCollection(
  collectionName: string,
  options?: FetchOptions
) {
  const { enabled = true } = options || {};

  const { data, error, isLoading, mutate } = useSWR(
    enabled ? [`collection:${collectionName}`] : null,
    async () => {
      try {
        const session = await getAuthSession();
        const userOrg = session?.user?.user_metadata?.organizationName ? slugifyOrg(session.user.user_metadata.organizationName) : null;

        // NEW: If the collection is a View (contains "report" or "view"), fetch from Supabase
        if (collectionName.includes('report') || collectionName.includes('view')) {
          let query = supabase.from(collectionName).select('*');
          if (userOrg) {
             query = query.filter('orgId', 'eq', userOrg);
          }
          const { data, error: fetchErr } = await query;
          if (fetchErr) throw fetchErr;
          return data || [];
        }

        const result = await getAllFromLocal(collectionName);
        return result.filter(item => {
          if (item.is_deleted || item.isDeleted) return false;
          // Enforce local multitenancy separation by orgName (using slugs)
          if (userOrg) {
              const itemOrg = slugifyOrg(item.orgId || item.org_id || '');
              if (itemOrg && itemOrg !== userOrg) return false;
          }
          return true;
        });
      } catch (err) {
        throw err;
      }
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
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
 * Hook for filtering and sorting collection data
 */
export function useFilteredCollection(
  collectionName: string,
  filter?: (item: any) => boolean,
  sortFn?: (a: any, b: any) => number,
  options?: FetchOptions
) {
  const { data, error, isLoading, mutate } = useCollection(collectionName, options);

  const filtered = data
    ? data.filter(filter || (() => true)).sort(sortFn || (() => 0))
    : [];

  return {
    data: filtered,
    error,
    isLoading,
    mutate,
  };
}

/**
 * Hook to refetch data
 */
export function useRefetch(collectionName: string, documentId?: string | null) {
  // Rely on the HybridSyncEngine to sync in the background
  return async () => {};
}
