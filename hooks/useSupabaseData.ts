import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FetchOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch data from Supabase (online-first)
 */
export function useSupabaseCollection(
  tableName: string,
  options?: FetchOptions
) {
  const { enabled = true } = options || {};
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data: result, error: fetchError } = await supabase
          .from(tableName)
          .select('*');
        
        if (fetchError) throw fetchError;
        setData(result || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tableName, enabled]);

  const mutate = () => {
    // Refetch data
    if (enabled) {
      const fetchData = async () => {
        try {
          setIsLoading(true);
          const { data: result, error: fetchError } = await supabase
            .from(tableName)
            .select('*');
          
          if (fetchError) throw fetchError;
          setData(result || []);
        } catch (err) {
          setError(err as Error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  };

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
