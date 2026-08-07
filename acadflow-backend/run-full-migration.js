const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');

(async () => {
  const connectionString = 'postgresql://postgres.bdrjxocqzdmhqwnwuulk:skandha_2026@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  const client = await pool.connect();
  try {
    console.log('Running migration_add_installments.sql...');
    const sql1 = fs.readFileSync(path.join(__dirname, 'database', 'migration_add_installments.sql'), 'utf8');
    await client.query(sql1);
    console.log('migration_add_installments.sql completed.');

    console.log('Running migration_add_paid_date.sql...');
    const sql2 = fs.readFileSync(path.join(__dirname, 'database', 'migration_add_paid_date.sql'), 'utf8');
    await client.query(sql2);
    console.log('migration_add_paid_date.sql completed.');

    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
