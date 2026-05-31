// scripts/clear_combines.js
// This script removes all rows from `combines_du_jour` and `matchs_du_combine`
// It uses the Supabase service role key for full access.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase anon key:', supabaseKey);
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or anon key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearTables() {
  console.log('🧹 Suppression des matchs du combine...');
  const { error: matchError } = await supabase.from('matchs_du_combine').delete().gt('id', 0);
  if (matchError) {
    console.error('Erreur lors de la suppression des matchs :', matchError.message);
  } else {
    console.log('✅ Matchs supprimés');
  }

  console.log('🧹 Suppression des combinés du jour...');
  const { error: combineError } = await supabase.from('combines_du_jour').delete().gt('id', 0);
  if (combineError) {
    console.error('Erreur lors de la suppression des combinés :', combineError.message);
  } else {
    console.log('✅ Combinés supprimés');
  }
}

clearTables()
  .then(() => console.log('🧹 Nettoyage terminé'))
  .catch((e) => console.error('Unexpected error:', e));
