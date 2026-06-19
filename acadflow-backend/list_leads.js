const db = require('./db');

async function listLeads() {
  const { data, error } = await db.from('leads').select('name, phone');
  if (error) console.error(error);
  else console.log(data);
  process.exit(0);
}

listLeads();
