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

    jwtClient = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    await jwtClient.authorize();
    return jwtClient;
}

async function addRow(data) {
    const auth = await authorize();
    if (!auth) return;

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Colunas Esperadas: Timestamp (Registro), Data da Compra, Item, Valor, Quantidade, Medida, Categoria, Subcategoria
    const values = [
        [
            new Date().toLocaleString('pt-BR'), // A: Timestamp de registro do sistema
            data.data || "",                    // B: Data efetiva da compra (extraída ou padrão)
            data.item || "",                    // C: Item
            data.valor || 0,                    // D: Valor
            data.quantidade || 0,               // E: Quantidade
            data.medida || "",                  // F: Medida (null/vazio ficará a célula em branco)
            data.categoria || "",               // G: Categoria
            data.subcategoria || "",            // H: Subcategoria (null/vazio ficará a célula em branco)
        ]
    ];

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Gastos!A:H', // Atualizado para ir até a coluna H
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });
        console.log('Row added to sheet');
    } catch (error) {
        console.error('Error adding to sheet:', error);
    }
}

module.exports = { addRow };
