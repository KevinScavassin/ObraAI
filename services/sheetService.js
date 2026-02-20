const { google } = require('googleapis');

// Note: You need to authenticate via Service Account or OAuth2.
// For simplicity, this assumes Service Account with JSON key in env or file.

// Load credentials from env or file
// Best practice: Use a 'service-account.json' file locally, don't commit it.
// Or parse from env.

let jwtClient;

async function authorize() {
    if (jwtClient) return jwtClient;

    // Option 1: Load from file (easier for local dev)
    // const keyFile = 'service-account.json'; 

    // Option 2: Load from Env (better for deployment)
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    if (!privateKey || !clientEmail) {
        console.warn("Google Sheets credentials missing in .env");
        return null;
    }

    jwtClient = new google.auth.JWT(
        clientEmail,
        null,
        privateKey,
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    await jwtClient.authorize();
    return jwtClient;
}

async function addRow(data) {
    const auth = await authorize();
    if (!auth) return;

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Expected columns: Timestamp, Item, Price, Quantity, Category, Project
    const values = [
        [
            new Date().toLocaleString('pt-BR'), // Timestamp
            data.item,
            data.price,
            data.quantity,
            data.category,
            data.project,
            JSON.stringify(data) // Raw data just in case
        ]
    ];

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:G', // Adjust 'Sheet1' if needed
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });
        console.log('Row added to sheet');
    } catch (error) {
        console.error('Error adding to sheet:', error);
    }
}

module.exports = { addRow };
