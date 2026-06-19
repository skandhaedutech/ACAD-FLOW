const supabase = require('../db');

async function testConnection() {
  console.log('--- Relational DB State ---');
  try {
    const { data: leads, error: lErr } = await supabase.from('leads').select('*, counselors(name), admissions(fees, payment_status)');
    if (lErr) {
      console.error('Error fetching leads:', lErr.message);
    } else {
      console.log(`Leads (${leads.length}):`);
      leads.forEach(l => {
        console.log(`- ${l.name} (${l.phone}) | Course: ${l.course_interested} | Score: ${l.lead_score} | Counselor: ${l.counselors?.name || 'None'} | Admitted: ${l.admissions && l.admissions.length > 0 ? 'Yes' : 'No'}`);
      });
    }

    const { data: counselors, error: cErr } = await supabase.from('counselors').select('*');
    if (cErr) {
      console.error('Error fetching counselors:', cErr.message);
    } else {
      console.log(`\nCounselors (${counselors.length}):`);
      counselors.forEach(c => {
        console.log(`- Name: ${c.name} | Email: ${c.email}`);
      });
    }

    const { data: followUps, error: fErr } = await supabase.from('follow_ups').select('*, leads(name)');
    if (fErr) {
      console.error('Error fetching followUps:', fErr.message);
    } else {
      console.log(`\nFollow-Ups (${followUps.length}):`);
      followUps.forEach(f => {
        console.log(`- Lead: ${f.leads?.name} | Date: ${f.followup_date} | Type: ${f.followup_type} | Status: ${f.status} | Remarks: ${f.remarks}`);
      });
    }

    const { data: admissions, error: aErr } = await supabase.from('admissions').select('*, leads(name)');
    if (aErr) {
      console.error('Error fetching admissions:', aErr.message);
    } else {
      console.log(`\nAdmissions (${admissions.length}):`);
      admissions.forEach(a => {
        console.log(`- Student: ${a.leads?.name} | Course: ${a.course} | Fees: ${a.fees} | Status: ${a.payment_status}`);
      });
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

testConnection();
