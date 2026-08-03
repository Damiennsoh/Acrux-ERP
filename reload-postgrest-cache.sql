-- Reload PostgREST Schema Cache
-- Run this in Supabase SQL Editor to fix PGRST205 / 404 errors

NOTIFY pgrst, 'reload schema';

-- Optional: Check notification queue usage
SELECT pg_notification_queue_usage();
