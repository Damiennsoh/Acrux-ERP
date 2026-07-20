import { createClient } from '@supabase/supabase-js';
import { getDB } from './indexeddb';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom storage adapter to keep the session in IndexedDB instead of localStorage
// This ensures the session survived "storage pressure" and is available fully offline.
const IndexedDBStorage = {
  getItem: async (key: string) => {
    try {
      const db = await getDB();
      const val = await db.get('auth_sessions', key);
      return val ? (typeof val.sessionData === 'string' ? val.sessionData : JSON.stringify(val.sessionData)) : null;
    } catch (e) {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      const db = await getDB();
      
      let parsedValue;
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        parsedValue = value;
      }

      await db.put('auth_sessions', {
        id: key,
        userId: parsedValue?.user?.id || 'anonymous',
        sessionData: parsedValue,
        createdAt: Date.now(),
        expiresAt: (parsedValue?.expires_at || 0) * 1000 || Date.now() + (30 * 24 * 60 * 60 * 1000)
      });
    } catch (e) {
      console.error('Failed to save session to IDB', e);
    }
  },
  removeItem: async (key: string) => {
    try {
      const db = await getDB();
      await db.delete('auth_sessions', key);
    } catch (e) {
      // Ignore
    }
  },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: IndexedDBStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);
