const axios = require('axios');

async function sendExpenseEmail(data) {
    // A URL mágica do Formspree que vai disparar o e-mail
    const formspreeUrl = process.env.FORMSPREE_URL;

    if (!formspreeUrl) {
        console.error('URL do Formspree não configurada no .env');
        return false;
    }

    // O corpo do e-mail trará os dados formatados
    const emailBody = `
      Data: ${data.data || new Date().toLocaleString('pt-BR')}
      Item: ${data.item || ""}
      Valor: ${data.valor || 0}
      Quantidade: ${data.quantidade || 0}
      Medida: ${data.medida || ""}
      Categoria: ${data.categoria || ""}
      Subcategoria: ${data.subcategoria || ""}
    `;

    try {
        // Envia os dados como um formulário web simples
        await axios.post(formspreeUrl, {
            email: process.env.FACENS_EMAIL,
            message: emailBody,
            _subject: '[NOVO GASTO OBRA]' // Força o assunto pro Power Automate ler
        });

        console.log('Dados enviados pro Formspree com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao enviar dados pro Formspree:', error.message);
        return false;
    }
}

module.exports = { sendExpenseEmail };
