const supabase = require('../db');

async function cleanBadData() {
  console.log('Cleaning up bad header data from Supabase...');
  try {
    // 1. Delete bad followups
    const { data: badLeads, error: findErr } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', 'Phone Number');
      
    if (findErr) throw findErr;
    
    if (badLeads && badLeads.length > 0) {
      const badLeadId = badLeads[0].id;
      
      // Cascade deletions will clean follow_ups and admissions automatically, but let's delete explicitly
      await supabase.from('follow_ups').delete().eq('lead_id', badLeadId);
      await supabase.from('admissions').delete().eq('lead_id', badLeadId);
      const { error: delLeadErr } = await supabase.from('leads').delete().eq('id', badLeadId);
      
      if (delLeadErr) {
        console.error('Error deleting lead:', delLeadErr.message);
      } else {
        console.log('✅ Deleted lead "Student Name".');
      }
    } else {
      console.log('No bad lead "Student Name" found.');
    }

    // 2. Delete bad counselor
    const { error: delCounselorErr } = await supabase
      .from('counselors')
      .delete()
      .eq('name', 'Counselor Name');

    if (delCounselorErr) {
      console.error('Error deleting counselor:', delCounselorErr.message);
    } else {
      console.log('✅ Deleted counselor "Counselor Name".');
    }
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

cleanBadData();
