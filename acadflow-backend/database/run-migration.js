const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function runMigration() {
  try {
    const connectionString = process.env.SUPABASE_DB_URL;

    if (!connectionString) {
      console.error('❌ Missing SUPABASE_DB_URL in .env');
      console.log('Please add your Supabase database URL to your .env file');
      console.log('You can find it in your Supabase project settings > Database > Connection Pooling > Transaction Mode');
      process.exit(1);
    }

    console.log('📚 Reading migration file...');
    const migrationSql = fs.readFileSync(
      path.join(__dirname, 'migration_fix_unique_phone.sql'),
      'utf8'
    );

    console.log('🔌 Connecting to PostgreSQL...');
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();

    try {
      console.log('🚀 Executing migration...');
      await client.query(migrationSql);

      console.log('✅ Migration executed successfully!');
    } finally {
      client.release();
      pool.end();
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error running migration:', err);
    console.log('\n📋 Please run the migration manually in your Supabase SQL Editor:');
    const migrationSql = fs.readFileSync(
      path.join(__dirname, 'migration_fix_unique_phone.sql'),
      'utf8'
    );
    console.log('\n' + migrationSql);
    process.exit(1);
  }
}

runMigration();
