const db = require('../db');
async function run() {
  const { data, error } = await db.from('admissions').select('*').limit(1);
  if (error) {
    console.error('Error fetching admissions:', error);
  } else {
    console.log('Admissions record keys:', data.length > 0 ? Object.keys(data[0]) : 'No records found');
    console.log('Full record:', data);
  }
}
run();
