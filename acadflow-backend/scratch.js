const db = require('./db');
async function checkDB() {
  const { data, error } = await db.from('leads').select('student_id, phone');
  console.log("Leads:", data);
}
checkDB();
