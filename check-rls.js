const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nskbbbjecyamzkdvbyli.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU0OTcxNywiZXhwIjoyMTAwMTI1NzE3fQ.ATi_rmqyK81WsDCZEp0CnzjvIojoYa3UjuLzL6_OnF0');

async function main() {
  const { data, error } = await supabase.rpc('run_sql', { 
    sql_query: "SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';" 
  });
  if (error) {
    console.error('RPC Error (it might not exist):', error);
  } else {
    console.log(data);
  }
}
main();
