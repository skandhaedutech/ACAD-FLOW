const db = require('./db');
async function checkDB() {
  const { data, error } = await db.from('installments').select('*').limit(1);
  if (error) {
    console.error("Error reading installments table:", error);
  } else {
    console.log("Installments structure:", data && data.length > 0 ? Object.keys(data[0]) : "No rows found, check table existence.");
  }
}
checkDB();
