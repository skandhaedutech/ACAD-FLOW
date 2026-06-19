const { google } = require('googleapis');
const db = require('../db');
const { calculateLeadScore } = require('./aiEngine');
const { generateNextStudentId } = require('./idGenerator');
require('dotenv').config();

// Initialize Google Auth
let auth;
if (process.env.GOOGLE_CREDS_JSON) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDS_JSON);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } catch (e) {
    console.error('Failed to parse GOOGLE_CREDS_JSON environment variable:', e);
    auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
} else {
  auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json', // Path to your service account key file for local dev
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

/**
 * Parses date strings in DD/MM/YYYY hh:mm:ss format or other fallback formats
 */
const parseSheetDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString();
  
  // Handle DD/MM/YYYY or MM/DD/YYYY format with potential time
  const parts = dateStr.trim().split(/[\/\s:]/);
  if (parts.length >= 3) {
    const firstVal = parseInt(parts[0], 10);
    const secondVal = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    let hour = 0;
    let minute = 0;
    let second = 0;
    
    if (parts.length >= 6) {
      hour = parseInt(parts[3], 10);
      minute = parseInt(parts[4], 10);
      second = parseInt(parts[5], 10);
    }
    
    let month = firstVal - 1; // 0-indexed month
    let day = secondVal;
    
    if (firstVal > 12 && secondVal <= 12) {
      month = secondVal - 1;
      day = firstVal;
    }
    
    if (day > 0 && day <= 31 && month >= 0 && month < 12 && year > 1900) {
      const date = new Date(year, month, day, hour, minute, second);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }
  
  const fallback = new Date(dateStr);
  return !isNaN(fallback.getTime()) ? fallback.toISOString() : new Date().toISOString();
};

let isSyncingDB = false;

/**
 * Fetch all rows from Google Sheets and sync to PostgreSQL relational tables
 */
const syncSheetsToDB = async (io) => {
  if (isSyncingDB) {
    console.log('Sync already in progress, skipping...');
    return;
  }
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    console.log('Skipping sync: SPREADSHEET_ID not configured in .env');
    return;
  }
  isSyncingDB = true;
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:M', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found in Google Sheets.');
      return;
    }

    let newlyAdded = 0;
    let updated = 0;

    const COURSE_MAPPING = {
      'DA': 'Data Analytics',
      'DS': 'Data Science & AI',
      'DM': 'Digital Marketing',
      'TALLY': 'Tally ERP & GST',
      'UI&UX-Digital Painting': 'UI/UX Design',
      'Digital marketing': 'Digital Marketing'
    };

    const COURSE_FEES = {
      'Data Analytics': 65000,
      'Data Science & AI': 95000,
      'Tally ERP & GST': 25000,
      'UI/UX Design': 48000,
      'Digital Marketing': 40000,
      'Full Stack Development': 85000,
      'Python Programming': 35000
    };

    for (const row of rows) {
      const student_name = row[1] ? row[1].trim() : '';
      const phone = row[2] ? row[2].trim() : '';
      
      if (!phone || phone === 'Phone Number' || phone.toLowerCase().includes('contact') || student_name === 'Student Name' || student_name.toLowerCase().includes('name')) continue;

      const name = student_name || ('Lead - ' + phone);
      const email = row[3] ? row[3].trim() : '';
      const course_interested_raw = row[4] ? row[4].trim() : '';
      const course_interested = COURSE_MAPPING[course_interested_raw] || course_interested_raw;
      
      const sheet_fees = row[5] ? parseFloat(row[5].toString().replace(/[^0-9.]/g, '')) : 0;
      const fees = sheet_fees || COURSE_FEES[course_interested] || 35000;
      
      const source = row[6] ? row[6].trim() : 'Google Sheet';
      
      let raw_status = row[7] ? row[7].trim() : 'Pending';
      let followup_status = 'Pending';
      if (raw_status.toLowerCase() === 'not interested' || raw_status.toLowerCase() === 'lost') {
        followup_status = 'Not Interested';
      } else if (raw_status.toLowerCase() === 'done') {
        followup_status = 'Done';
      } else if (raw_status.toLowerCase() === 'converted' || raw_status.toLowerCase() === 'admitted') {
        followup_status = 'Converted';
      } else {
        followup_status = 'Pending';
      }

      const admission_status = (row[8] && row[8].trim() === 'Admitted') || followup_status === 'Converted' ? 'Admitted' : 'Not Admitted';
      if (admission_status === 'Admitted' && followup_status !== 'Converted') {
        followup_status = 'Converted';
      }

      const counselor_name = row[9] ? row[9].trim() : '';
      const last_contacted_str = row[11] || row[10] || '';
      
      const manual_student_id = row[0] ? row[0].trim() : null;
      
      let counselorId = null;
      if (counselor_name) {
        const { data: existingCounselors, error: cErr } = await db
          .from('counselors')
          .select('id')
          .eq('name', counselor_name);

        if (cErr) {
          console.error('Error fetching counselor:', cErr);
        } else if (existingCounselors && existingCounselors.length > 0) {
          counselorId = existingCounselors[0].id;
        } else {
          const cEmail = `${counselor_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@acadflow.com`;
          const { data: newCounselors, error: createCErr } = await db
            .from('counselors')
            .insert([{
              name: counselor_name,
              email: cEmail,
              role: 'Counselor',
              organization_id: '00000000-0000-0000-0000-000000000001',
              branch_id: '00000000-0000-0000-0000-000000000002'
            }])
            .select('id');

          if (createCErr) {
            console.error('Error creating counselor:', createCErr);
          } else if (newCounselors && newCounselors.length > 0) {
            counselorId = newCounselors[0].id;
          }
        }
      }

      const { data: existingLeads, error: selectError } = await db
        .from('leads')
        .select('*')
        .eq('phone', phone);

      if (selectError) {
        console.error('Error fetching lead from Supabase:', selectError);
        continue;
      }

      const created_at = parseSheetDate(last_contacted_str);

      if (existingLeads && existingLeads.length === 0) {
        const lead_score = calculateLeadScore({
          lead_source: source,
          followup_status: followup_status,
          interested_course: course_interested
        });

        const nextStudentId = manual_student_id || await generateNextStudentId();

        const { data: newLeads, error: insertError } = await db
          .from('leads')
          .insert([{
            name,
            student_id: nextStudentId,
            phone,
            email,
            course_interested,
            source,
            status: followup_status,
            lead_score,
            counselor_id: counselorId,
            created_at,
            updated_at: created_at,
            organization_id: '00000000-0000-0000-0000-000000000001',
            branch_id: '00000000-0000-0000-0000-000000000002'
          }])
          .select('id');
        
        if (insertError) {
          console.error('Error inserting lead into Supabase:', insertError);
        } else if (newLeads && newLeads.length > 0) {
          const leadId = newLeads[0].id;
          newlyAdded++;

          if (io && io.addNotification) {
            io.addNotification({
              title: lead_score > 80 ? "New hot lead assigned 🔥" : "New lead assigned 👤",
              message: `${name} is interested in ${course_interested} (Score: ${lead_score}%).`,
              type: "LEAD_ALERT",
              priority: lead_score > 80 ? "High" : "Low",
              action_url: `/leads?search=${name}`
            });
          }

          const { error: followUpError } = await db
            .from('follow_ups')
            .insert([{
              lead_id: leadId,
              followup_date: created_at,
              followup_type: 'Call',
              status: followup_status === 'Pending' ? 'Pending' : 'Completed',
              remarks: 'Initial sync from Google Sheets',
              created_by: counselorId,
              organization_id: '00000000-0000-0000-0000-000000000001',
              branch_id: '00000000-0000-0000-0000-000000000002'
            }]);

          if (followUpError) {
            console.error('Error creating follow-up:', followUpError);
          }

          if (admission_status === 'Admitted') {
            const { error: admissionError } = await db
              .from('admissions')
              .insert([{
                lead_id: leadId,
                course: course_interested,
                fees,
                payment_status: 'Pending',
                joined_date: created_at,
                organization_id: '00000000-0000-0000-0000-000000000001',
                branch_id: '00000000-0000-0000-0000-000000000002'
              }]);

            if (admissionError) {
              console.error('Error creating admission:', admissionError);
            }
          }
        }
      } else {
        const lead = existingLeads[0];
        const hasBasicChanges = lead.name !== name || lead.course_interested !== course_interested || lead.counselor_id !== counselorId || lead.email !== email || (manual_student_id && lead.student_id !== manual_student_id);
        const statusChanged = lead.status !== followup_status;

        if (hasBasicChanges || statusChanged) {
          const updates = {};
          if (lead.name !== name) updates.name = name;
          if (lead.email !== email) updates.email = email;
          if (lead.course_interested !== course_interested) updates.course_interested = course_interested;
          if (lead.counselor_id !== counselorId) updates.counselor_id = counselorId;
          if (manual_student_id && lead.student_id !== manual_student_id) updates.student_id = manual_student_id;
          if (statusChanged) updates.status = followup_status;

          const { error: updateError } = await db
            .from('leads')
            .update(updates)
            .eq('id', lead.id);

          if (updateError) {
            console.error('Error updating lead in DB:', updateError);
          } else {
            updated++;
          }
        }

        const { data: existingAdmissions, error: admSelectError } = await db
          .from('admissions')
          .select('id')
          .eq('lead_id', lead.id);

        if (!admSelectError) {
          const hasAdmissionRecord = existingAdmissions && existingAdmissions.length > 0;
          if (admission_status === 'Admitted' && !hasAdmissionRecord) {
            await db.from('admissions').insert([{
              lead_id: lead.id,
              course: course_interested,
              fees,
              payment_status: 'Pending',
              joined_date: created_at,
              organization_id: '00000000-0000-0000-0000-000000000001',
              branch_id: '00000000-0000-0000-0000-000000000002'
            }]);
          } else if (admission_status !== 'Admitted' && hasAdmissionRecord) {
            await db.from('admissions').delete().eq('lead_id', lead.id);
          }
        }
      }
    }

    if (newlyAdded > 0 || updated > 0) {
      console.log(`Successfully synced: ${newlyAdded} new leads, ${updated} updated leads.`);
      if (io) {
        io.emit('leads_updated', { message: 'New leads synced from Google Sheets', count: newlyAdded + updated });
        if (io.addNotification) {
          io.addNotification({
            title: "Google Sheets synced successfully 🔄",
            message: `Synced ${newlyAdded} new leads, ${updated} updated leads from external database.`,
            type: "SYSTEM_ALERT",
            priority: "Low",
            action_url: "/"
          });
        }
      }
    }

  } catch (error) {
    console.error('Error syncing Google Sheets to DB:', error);
  } finally {
    isSyncingDB = false;
  }
};

/**
 * Update a specific lead in Google Sheets (DB to Sheet)
 */
const updateLeadInSheet = async (phone, statusData) => {
  if (!SPREADSHEET_ID) return;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:L',
    });

    const rows = response.data.values;
    if (!rows) return;

    const rowIndex = rows.findIndex(row => row[2] && row[2].trim() === phone.trim());
    
    if (rowIndex !== -1) {
      const sheetRowNumber = rowIndex + 1;
      
      let statusText = statusData.followup_status;
      if (statusData.followup_status === 'Pending') {
        statusText = 'Follow up';
      }
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!H${sheetRowNumber}:I${sheetRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [
            [statusText, statusData.admission_status]
          ]
        }
      });
      console.log(`Successfully updated lead ${phone} in Google Sheet.`);
    }
  } catch (error) {
    console.error('Error updating Google Sheet:', error);
  }
};

/**
 * Append a new lead to Google Sheets (DB to Sheet)
 */
const appendLeadToSheet = async (leadData) => {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') return;

  try {
    const timestamp = new Date().toLocaleString();
    const values = [
      [
        leadData.student_id || '', // A (0): STUDENT ID
        timestamp, // B (1): DATE ADDED
        leadData.name || '', // C (2): STUDENT PROFILE
        leadData.phone || '', // D (3): PHONE NUMBER
        leadData.email || '', // E (4): EMAIL
        leadData.course_interested || '', // F (5): TARGET PROGRAM
        '', // G (6): COURSE FEE
        leadData.source || '', // H (7): LEAD SOURCE
        leadData.status || 'Pending', // I (8): LEAD STATUS
        'Not Admitted', // J (9): ENROLLMENT
        leadData.counselor_name || '', // K (10): ASSIGN
        leadData.followup_time || '', // L (11): TIMEFRAME
        timestamp, // M (12): LAST CONTACTED
        leadData.lead_score || '', // N (13): SCORE
        leadData.city || '', // O (14): CITY
        '' // P (15): STATE
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:Q',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values }
    });
    console.log(`Successfully appended lead ${leadData.name} to Google Sheet.`);
  } catch (error) {
    console.error('Error appending lead to Google Sheet:', error);
  }
};

module.exports = {
  syncSheetsToDB,
  updateLeadInSheet,
  appendLeadToSheet
};
