const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');

(async () => {
  const connectionString = 'postgresql://postgres.bdrjxocqzdmhqwnwuulk:Skandha2026_@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  const sql = fs.readFileSync(path.join(__dirname, 'database', 'migration_add_installments.sql'), 'utf8');
  const client = await pool.connect();
  try {
    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
