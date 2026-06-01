require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function main() {
  await supabase.from('matchs_du_combine').update({ statut_match: 'gagne' }).eq('combine_id', 126);
  await supabase.from('combines_du_jour').update({ statut: 'gagne' }).eq('id', 126);
  console.log("Updated combine 126");
}
main();
