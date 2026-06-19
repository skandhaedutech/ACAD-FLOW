const supabase = require('../db');

async function checkSchema() {
  try {
    const { data: leads, error } = await supabase.from('leads').select('*').limit(1);
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Raw lead record from DB:');
      console.log(JSON.stringify(leads[0], null, 2));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkSchema();
