import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * GET /api/check-admin
 *
 * Returns { hasAdmin: boolean } using the service role key so it can
 * bypass RLS and check whether ANY admin exists — even before a user
 * is logged in. This is used by the auth page to conditionally show
 * or hide the "System Administration" setup button.
 */
export async function GET() {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      // Fallback: if server is not configured, assume admin exists
      // to prevent accidentally exposing the setup button in production.
      return NextResponse.json({ hasAdmin: true });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('isAdmin', true)
      .limit(1);

    if (error) {
      console.error('[check-admin] Query error:', error.message);
      // On error, default to hasAdmin=true to prevent exposing setup button
      return NextResponse.json({ hasAdmin: true });
    }

    return NextResponse.json({ hasAdmin: (data?.length ?? 0) > 0 });

  } catch (err) {
    console.error('[check-admin] Unexpected error:', err);
    return NextResponse.json({ hasAdmin: true });
  }
}
