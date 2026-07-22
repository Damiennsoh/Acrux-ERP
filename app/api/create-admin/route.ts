import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, password, name, role = 'admin', organizationName, department } = body;

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

    // Try to create user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        staffId,
        name,
        role,
        isAdmin: role === 'admin' || role === 'superadmin',
        organizationName: orgSlug,
        department: department || 'General'
      },
      email_confirm: true
    });

    // Handle duplicate email gracefully
    if (error && error.message.includes('already been registered')) {
      // Find existing user by email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(u => u.email === email);
      
      if (existingUser) {
        // Try to create profile if it doesn't exist
        await supabase.from('user_profiles').upsert({
          id: existingUser.id,
          staffId,
          name,
          role,
          isAdmin: role === 'admin' || role === 'superadmin',
          organizationName: orgSlug,
          department: department || 'General'
        }, { onConflict: 'id' });
        
        return NextResponse.json({ 
          success: true, 
          user: { id: existingUser.id },
          message: 'User already exists' 
        });
      }
    }

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Create user profile
    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: data.user.id,
      staffId,
      name,
      role,
      isAdmin: role === 'admin' || role === 'superadmin',
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
        id: data.user.id,
        email,
        staffId,
        name,
        role,
        isAdmin: role === 'admin' || role === 'superadmin'
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
