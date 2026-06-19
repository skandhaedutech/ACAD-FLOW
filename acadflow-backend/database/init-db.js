const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.SUPABASE_DB_URL; // Using the direct Postgres connection string

if (!connectionString) {
  console.error('Error: SUPABASE_DB_URL not found in .env');
  console.log('To run this script, you need the direct PostgreSQL connection string from Supabase (Database -> Settings -> URI).');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDB() {
  try {
    console.log('Connecting to PostgreSQL database...');
    const client = await pool.connect();
    
    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    console.log('Executing schema script...');
    await client.query(schemaSql);
    
    console.log('✅ Database schema created successfully!');
    client.release();
  } catch (error) {
    console.error('❌ Error executing schema:', error.message);
  } finally {
    pool.end();
  }
}

initDB();
