const db = require('./db');

async function dropConstraint() {
  console.log('Fetching constraints for leads table...');
  const { data, error } = await db.rpc('drop_phone_unique_constraint');
  
  if (error) {
    // If there is no such RPC, we might have to use raw SQL, but supabase JS client cannot run raw SQL easily without RPC.
    console.error('RPC Error:', error);
    // Let's try to see if we can use postgres connection directly.
  } else {
    console.log('Result:', data);
  }
}

dropConstraint();
