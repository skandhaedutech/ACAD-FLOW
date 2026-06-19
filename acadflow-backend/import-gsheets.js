require('dotenv').config();
const { syncSheetsToDB } = require('./services/googleSheets');

async function runMigration() {
  console.log('🚀 Starting one-time Google Sheets historical migration...');
  
  if (!process.env.SPREADSHEET_ID) {
    console.error('❌ SPREADSHEET_ID is missing in .env. Cannot migrate.');
    process.exit(1);
  }
  
  try {
    await syncSheetsToDB(null);
    console.log('✅ Migration process completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
  
  console.log('👋 You can now safely ignore Google Sheets and rely entirely on Supabase.');
  process.exit(0);
}

runMigration();
