const db = require('../db');

/**
 * Generate the next sequential Student ID (e.g., SKUEDU0701)
 */
async function generateNextStudentId() {
  try {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // '07'
    const prefix = `SKUEDU${month}`;
    
    let maxNum = 0;
    
    // Fetch all leads that have a student_id starting with this month's prefix
    const { data: allLeads, error: maxIdError } = await db
      .from('leads')
      .select('student_id')
      .not('student_id', 'is', null)
      .like('student_id', `${prefix}%`);

    if (!maxIdError && allLeads && allLeads.length > 0) {
      allLeads.forEach(lead => {
        const id = lead.student_id.toUpperCase();
        if (id.startsWith(prefix)) {
          const numPartStr = id.replace(prefix, '');
          const numPart = parseInt(numPartStr, 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });
    }
    
    const nextNum = maxNum + 1;
    // Format running number with at least 2 digits padding
    const runningNumberStr = String(nextNum).padStart(2, '0');
    return `${prefix}${runningNumberStr}`;
  } catch (err) {
    console.error('Error generating student ID:', err);
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 90) + 10);
    return `SKUEDU${month}${rand}`; // fallback
  }
}

module.exports = {
  generateNextStudentId
};
