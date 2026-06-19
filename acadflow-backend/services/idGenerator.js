const db = require('../db');

/**
 * Generate the next sequential Student ID (e.g., SKEDU000426)
 */
async function generateNextStudentId() {
  try {
    let nextId = 'SKEDU000001';
    let maxNum = 0;
    
    // Instead of just taking the first one (which might be lowercase and break), 
    // let's fetch a few and find the highest valid number.
    const { data: allLeads, error: maxIdError } = await db
      .from('leads')
      .select('student_id')
      .not('student_id', 'is', null);

    if (!maxIdError && allLeads && allLeads.length > 0) {
      allLeads.forEach(lead => {
        const id = lead.student_id.toUpperCase();
        if (id.startsWith('SKEDU')) {
          const numPart = parseInt(id.replace('SKEDU', ''), 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });
      nextId = `SKEDU${String(maxNum + 1).padStart(6, '0')}`;
    }
    return nextId;
  } catch (err) {
    console.error('Error generating student ID:', err);
    return `SKEDU${String(Math.floor(Math.random() * 900000) + 100000)}`; // fallback
  }
}

module.exports = {
  generateNextStudentId
};
