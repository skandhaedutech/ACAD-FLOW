const db = require('./db');

async function deleteAll() {
  console.log('Fetching leads from "leads" table...');
  const { data, error } = await db.from('leads').select('id');
  if (error) {
    console.error('Error fetching leads:', error);
    process.exit(1);
  }
  
  if (!data || data.length === 0) {
    console.log('No leads found.');
    process.exit(0);
  }

  console.log(`Found ${data.length} leads. Deleting...`);
  
  for (const lead of data) {
    const { error: deleteError } = await db.from('leads').delete().eq('id', lead.id);
    if (deleteError) {
      console.error('Error deleting lead', lead.id, deleteError);
    }
  }
  
  console.log('All leads deleted successfully from "leads" table.');
  process.exit(0);
}

deleteAll();
