const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

async function checkSheet() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:L30',
    });
    console.log('All rows fetched:');
    response.data.values.forEach((row, idx) => {
      console.log(`Row ${idx + 1}:`, row);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSheet();
