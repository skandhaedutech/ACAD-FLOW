---
title: AcadFlow Backend
emoji: 🎓
colorFrom: green
colorTo: gray
sdk: docker
app_port: 5000
---

# AcadFlow CRM - Backend Server

This is the Express.js backend server for AcadFlow CRM, deployed to Hugging Face Spaces.

## Setup Instructions

Hugging Face Spaces runs this automatically using the included `Dockerfile` on port `5000`.
Ensure that the following secret Environment Variables are added under the Space **Settings ➔ Variables and Secrets**:

* `SUPABASE_DB_URL`: The URL to your Supabase PostgreSQL database.
* `SPREADSHEET_ID`: Your Google Sheets spreadsheet identifier.
* `GOOGLE_CREDS_JSON`: Copy the raw text from your `credentials.json` service account key file and paste it as a secret value.
