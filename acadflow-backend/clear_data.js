const db = require('./db');

async function clearData() {
  console.log('Clearing admissions...');
  let res = await db.from('admissions').delete().not('id', 'is', null);
  
  console.log('Clearing follow_ups...');
  res = await db.from('follow_ups').delete().not('id', 'is', null);
  
  console.log('Clearing audit_logs...');
  res = await db.from('audit_logs').delete().not('id', 'is', null);
  
  console.log('Clearing leads...');
  res = await db.from('leads').delete().not('id', 'is', null);

  console.log('Done clearing all data!');
  process.exit(0);
}

clearData();
