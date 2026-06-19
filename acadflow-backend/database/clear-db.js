const supabase = require('../db');

async function clearDB() {
  console.log('Clearing database tables for clean sync test...');
  try {
    // Truncating tables CASCADE equivalent is deleting all records
    const { error: err1 } = await supabase.from('follow_ups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) console.error('Error clearing follow_ups:', err1.message);

    const { error: err2 } = await supabase.from('admissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) console.error('Error clearing admissions:', err2.message);

    const { error: err3 } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err3) console.error('Error clearing leads:', err3.message);

    const { error: err4 } = await supabase.from('counselors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err4) console.error('Error clearing counselors:', err4.message);

    const { error: err5 } = await supabase.from('ai_insights').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err5) console.error('Error clearing ai_insights:', err5.message);

    console.log('✅ All tables cleared successfully.');
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

clearDB();
