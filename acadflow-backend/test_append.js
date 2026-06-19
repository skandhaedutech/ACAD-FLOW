const { appendLeadToSheet } = require('./services/googleSheets');

async function test() {
  await appendLeadToSheet({
    student_id: 'TEST-001',
    name: 'Test Lead',
    phone: '1234567890',
    email: 'test@example.com',
    course_interested: 'React',
    source: 'Website',
    status: 'Pending',
    counselor_name: 'Test Counselor',
    followup_time: 'One Day',
    remarks: 'Test remark',
    lead_score: 50,
    city: 'Test City'
  });
  console.log('Done');
}

test();
