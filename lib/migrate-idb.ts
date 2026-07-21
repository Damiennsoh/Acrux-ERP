import { getDB } from './indexeddb';
import { supabase } from './supabase';
import { slugifyOrg } from './utils/org';

export async function migrateAndSyncOrganizationData() {
  console.log('[Migration] Starting IDB normalization...');
  
  try {
    const db = await getDB();
    const profiles = await db.getAll('user_profiles');
    
    if (profiles.length === 0) {
      return { success: true, count: 0 };
    }

    let updatedCount = 0;
    const normalizedProfiles: any[] = [];

    for (const profile of profiles) {
      const rawOrg = profile.organizationName || 'unknown-org';
      const normalizedOrg = slugifyOrg(rawOrg);
      
      if (rawOrg !== normalizedOrg) {
        const updatedProfile = { ...profile, organizationName: normalizedOrg };
        await db.put('user_profiles', updatedProfile);
        normalizedProfiles.push(updatedProfile);
        updatedCount++;
        
        console.log(`[Migration] Normalized: "${rawOrg}" -> "${normalizedOrg}"`);
      } else {
        normalizedProfiles.push(profile);
      }
    }

    // Push to Supabase
    if (navigator.onLine && normalizedProfiles.length > 0) {
      const { error } = await supabase
        .from('user_profiles')
        .upsert(normalizedProfiles, { onConflict: 'id' });
        
      if (error) throw new Error(`Supabase sync failed: ${error.message}`);
      
      // Create organization records
      const uniqueOrgs = [...new Set(normalizedProfiles.map(p => p.organizationName))];
      for (const orgSlug of uniqueOrgs) {
        await supabase.from('organizations').upsert({
          id: orgSlug,
          name: orgSlug.toUpperCase().replace(/-/g, ' '),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: false
        }, { onConflict: 'id' });
      }
    }

    return { success: true, count: updatedCount };
    
  } catch (err: any) {
    console.error('[Migration] Failed:', err);
    return { success: false, error: err.message };
  }
}
