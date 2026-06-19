const db = require('./db');
async function run() {
  const { data } = await db.from('active_leads').select('*');
  console.log(data);
  process.exit(0);
}
run();
