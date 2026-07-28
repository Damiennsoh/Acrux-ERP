const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nskbbbjecyamzkdvbyli.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU0OTcxNywiZXhwIjoyMTAwMTI1NzE3fQ.ATi_rmqyK81WsDCZEp0CnzjvIojoYa3UjuLzL6_OnF0');

async function main() {
  const tables = [
    'projects', 'revenue', 'miscellaneous', 'development_tools', 
    'development_costs', 'broker_payments', 'expenses', 'materials', 
    'petty_cash', 'audit_logs'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table} error:`, error.message || error.code);
    } else {
      console.log(`Table ${table} EXISTS and is accessible.`);
    }
  }
}
main();
