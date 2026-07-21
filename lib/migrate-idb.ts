// lib/migrate-idb.ts
import { getDB } from './indexeddb';
import { supabase } from './supabase';
import { slugifyOrg } from './utils/org';

export async function migrateAndSyncOrganizationData() {
  console.log('[Migration] Starting IDB normalization...');
  
  try {
    const db = await getDB();
    
    // 1. Get all profiles from IndexedDB
    const profiles = await db.getAll('user_profiles');
    if (profiles.length === 0) {
      console.log('[Migration] No profiles found in IndexedDB.');
      return { success: true, count: 0 };
    }

    let updatedCount = 0;
    const normalizedProfiles: any[] = [];

    // 2. Normalize organization names locally
    for (const profile of profiles) {
      const rawOrg = profile.organizationName || 'unknown-org';
      const normalizedOrg = slugifyOrg(rawOrg);
      
      // Only update if different
      if (rawOrg !== normalizedOrg) {
        const updatedProfile = { 
          ...profile, 
          organizationName: normalizedOrg 
        };
        
        // Save back to IndexedDB immediately
        await db.put('user_profiles', updatedProfile);
        normalizedProfiles.push(updatedProfile);
        updatedCount++;
        
        console.log(`[Migration] Normalized: "${rawOrg}" -> "${normalizedOrg}" for user ${profile.name}`);
      } else {
        normalizedProfiles.push(profile);
      }
    }

    console.log(`[Migration] Updated ${updatedCount} records locally.`);

    // 3. Push normalized data to Supabase
    if (navigator.onLine && normalizedProfiles.length > 0) {
      console.log('[Migration] Syncing normalized data to Supabase...');
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert(normalizedProfiles, { onConflict: 'id' });
        
      if (error) {
        throw new Error(`Supabase sync failed: ${error.message}`);
      }
      
      console.log('[Migration] ✅ Successfully synced to Supabase!');
      
      // Also create the organization record if missing
      const uniqueOrgs = [...new Set(normalizedProfiles.map(p => p.organizationName))];
      for (const orgSlug of uniqueOrgs) {
        const rawName = normalizedProfiles.find(p => p.organizationName === orgSlug)?.name?.split(' ')[0] || orgSlug;
        await supabase.from('organizations').upsert({
          id: orgSlug,
          name: rawName.toUpperCase(), // Store human-readable name
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: false
        }, { onConflict: 'id' });
      }
    }

    return { success: true, count: updatedCount };
    
  } catch (err: any) {
    console.error('[Migration] ❌ Failed:', err);
    return { success: false, error: err.message };
  }
}
