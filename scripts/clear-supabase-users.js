/**
 * Script to clear all Supabase users and user profiles
 * This requires the SERVICE_ROLE_KEY which has admin privileges
 * 
 * Usage: node scripts/clear-supabase-users.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function clearAllUsers() {
  console.log('Starting Supabase cleanup...');
  console.log('=====================================');

  try {
    // Step 1: Delete all user profiles
    console.log('\n1. Deleting user profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError.message);
    } else if (profiles && profiles.length > 0) {
      console.log(`Found ${profiles.length} user profiles`);
      
      const { error: deleteProfilesError } = await supabase
        .from('user_profiles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteProfilesError) {
        console.error('Error deleting profiles:', deleteProfilesError.message);
      } else {
        console.log('✓ User profiles deleted');
      }
    } else {
      console.log('No user profiles found');
    }

    // Step 2: List all users (requires admin privileges)
    console.log('\n2. Fetching all auth users...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError.message);
      console.error('Note: This requires SERVICE_ROLE_KEY with admin privileges');
    } else {
      console.log(`Found ${users.length} auth users`);
      
      if (users.length > 0) {
        console.log('\n3. Deleting auth users...');
        let deletedCount = 0;
        
        for (const user of users) {
          try {
            const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
            if (deleteUserError) {
              console.error(`Error deleting user ${user.email}:`, deleteUserError.message);
            } else {
              deletedCount++;
              console.log(`✓ Deleted user: ${user.email || user.id}`);
            }
          } catch (err) {
            console.error(`Error deleting user ${user.id}:`, err.message);
          }
        }
        
        console.log(`\n✓ Deleted ${deletedCount}/${users.length} auth users`);
      } else {
        console.log('No auth users to delete');
      }
    }

    console.log('\n=====================================');
    console.log('Supabase cleanup completed!');
    console.log('\nNext steps:');
    console.log('1. Clear your browser IndexedDB (use reset-auth.html)');
    console.log('2. Go to the login page');
    console.log('3. Click "Create Administrator" to create a fresh admin');
    
  } catch (error) {
    console.error('Fatal error during cleanup:', error);
    process.exit(1);
  }
}

clearAllUsers();
