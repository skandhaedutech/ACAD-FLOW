const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.SUPABASE_DB_URL;

async function test() {
  console.log('Testing PG connection string:', connectionString);
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection successful!');
    const res = await client.query('SELECT NOW()');
    console.log('Current time from DB:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
  } finally {
    pool.end();
  }
}
test();
