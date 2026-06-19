const db = require('./db');

async function checkIds() {
  const { data, error } = await db.from('leads').select('name, phone, student_id');
  if (error) console.error(error);
  else console.log(data);
  process.exit(0);
}

checkIds();
