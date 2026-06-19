const db = require('./db');

async function test() {
  const { data: leads, error } = await db
    .from('active_leads')
    .select(`
      *,
      student_id,
      counselors (
        name
      ),
      admissions (
        course,
        fees,
        payment_status
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const formattedLeads = (leads || []).map(lead => {
    const hasAdmission = lead.admissions && lead.admissions.length > 0;
    const admissionRecord = hasAdmission ? lead.admissions[0] : null;

    return {
      id: lead.id,
      student_name: lead.name,
      phone_number: lead.phone,
      student_id: lead.student_id || 'DEFAULT_IF_MISSING'
    };
  });

  console.log(JSON.stringify(formattedLeads, null, 2));
  process.exit(0);
}

test();
