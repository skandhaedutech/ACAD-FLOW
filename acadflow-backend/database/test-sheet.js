const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

async function testSheet() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:L3', // Fetch headers + first two rows
    });
    console.log('Headers and first rows from Google Sheets:');
    console.log(JSON.stringify(response.data.values, null, 2));
  } catch (error) {
    console.error('Error fetching sheet:', error);
  }
}

testSheet();
