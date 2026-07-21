import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, password, name, organizationName, department } = body;

    // Validate password length (Supabase requires 8+ chars)
    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!staffId || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create service role client (bypasses rate limits)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Generate dummy email (required by Supabase but not used)
    const clean = staffId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${clean}@acrux.local`;
    const orgSlug = (organizationName || 'ACRUX IT SOLUTIONS').toLowerCase().replace(/\s+/g, '-');

    // Create user with service role (bypasses rate limits)
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // KEY FIX: Auto-confirm so login works immediately
      user_metadata: {
        staffId,
        name,
        role: 'admin',
        isAdmin: true,
        organizationName: orgSlug,
        department: department || 'General'
      }
    });

    if (adminError) {
      console.error('Admin creation error:', adminError);
      return NextResponse.json(
        { success: false, error: adminError.message },
        { status: 400 }
      );
    }

    if (!adminData?.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create user profile
    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: adminData.user.id,
      staffId,
      name,
      role: 'admin',
      isAdmin: true,
      organizationName: orgSlug,
      department: department || 'General',
      defaultCurrency: 'USD'
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Continue anyway - user is created
    }

    return NextResponse.json({
      success: true,
      user: {
        id: adminData.user.id,
        email,
        staffId,
        name,
        role: 'admin',
        isAdmin: true
      }
    });

  } catch (error) {
    console.error('Create admin API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
