const { createClient } = require('@supabase/supabase-js');

// Node automatically loads process.env since node 20 with --env-file
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  console.log("Checking DB...");
  const { data: projects, error: pErr } = await supabase.from('projects').select('id, name');
  if (pErr) console.error("Error projects:", pErr);
  else console.log(`Total projects in DB: ${projects.length}`);

  const { data: profiles, error: prErr } = await supabase.from('profiles').select('email, is_superadmin');
  if (prErr) console.error("Error profiles:", prErr);
  else {
    const me = profiles.find(p => p.email === 'javaloss@uni.pe');
    console.log(`Profile javaloss@uni.pe -> is_superadmin: ${me ? me.is_superadmin : 'Not found'}`);
  }
}

check();
