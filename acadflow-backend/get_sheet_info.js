const { google } = require('googleapis');
require('dotenv').config();

const credentials = require('./credentials.json');
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

async function getSheetInfo() {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    console.log("Sheet names:");
    response.data.sheets.forEach(sheet => {
      console.log(sheet.properties.title);
    });
  } catch (error) {
    console.error("Error fetching metadata:", error);
  }
}

getSheetInfo();
