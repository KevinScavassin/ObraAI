const nodemailer = require('nodemailer');

async function sendExpenseEmail(data) {
    // Configuração do remetente (precisará de uma Senha de App do Gmail)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    // O corpo do e-mail trará os dados formatados de um jeito fácil pro Power Automate ler
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.FACENS_EMAIL,
        subject: '[NOVO GASTO OBRA]',
        text: `
      Data: ${data.data || new Date().toLocaleString('pt-BR')}
      Item: ${data.item || ""}
      Valor: ${data.valor || 0}
      Quantidade: ${data.quantidade || 0}
      Medida: ${data.medida || ""}
      Categoria: ${data.categoria || ""}
      Subcategoria: ${data.subcategoria || ""}
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('E-mail enviado para o Power Automate:', info.messageId);
        return true;
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        return false;
    }
}

module.exports = { sendExpenseEmail };
