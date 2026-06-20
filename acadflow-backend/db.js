const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;
let dbError = null;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  dbError = 'Missing Supabase credentials (SUPABASE_URL or SUPABASE_KEY)';
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        transport: ws,
      },
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    dbError = err.message;
  }
}

module.exports = supabase;
module.exports.dbError = dbError;
