const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSchema() {
  console.log("Checking active_leads view...");
  const { data, error } = await supabase.from('active_leads').select('*').limit(1);
  if (error) {
    console.error("Error fetching active_leads:", error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log("Columns in 'active_leads' view:");
    console.log(Object.keys(data[0]));
    console.log("Sample data:", data[0]);
  } else {
    console.log("No data found in 'active_leads' view.");
  }
}

checkSchema();
