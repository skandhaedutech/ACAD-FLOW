const { google } = require('googleapis');
require('dotenv').config();

const credentials = require('./credentials.json');
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

async function checkHeaders() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:Z1', 
    });
    console.log("Headers:", response.data.values[0]);
  } catch (error) {
    console.error(error);
  }
}

checkHeaders();
