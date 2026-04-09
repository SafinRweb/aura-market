const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.from('custom_events').select('*').limit(1);
  if (error) {
    console.log("Error querying custom_events:", error.message);
  } else {
    console.log("custom_events table exists. Data:", data);
  }

  const { data: d2, error: e2 } = await supabase.from('events').select('*').limit(1);
  if (e2) {
    console.log("Error querying events:", e2.message);
  } else {
    console.log("events table exists. Data:", d2);
  }
}

checkSchema();
