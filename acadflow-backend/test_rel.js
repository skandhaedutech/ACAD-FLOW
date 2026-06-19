const db = require('./db');

async function testQuery() {
  const { data: admissions, error: admError } = await db
    .from('active_admissions')
    .select(`
      id,
      leads (
        id,
        student_id,
        name
      )
    `);
  if (admError) console.error("Adm Error:", admError);
  else console.log("Admissions:", JSON.stringify(admissions, null, 2));

  const { data: leads, error: leadError } = await db
    .from('active_leads')
    .select(`id, student_id, name`);
  
  if (leadError) console.error("Lead Error:", leadError);
  else console.log("Leads:", JSON.stringify(leads, null, 2));

  process.exit(0);
}

testQuery();
