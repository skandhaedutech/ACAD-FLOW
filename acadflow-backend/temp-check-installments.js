const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  try {
    const { data, error, status } = await supabase.from('installments').select('*').limit(5);
    console.log('status', status);
    if (error) {
      console.error('error', error);
      process.exit(1);
    }
    console.log('data', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('exception', err.message);
    process.exit(1);
  }
})();
