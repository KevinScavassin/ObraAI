require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    console.log("Verificando a chave da API...");
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.error("ERRO: GOOGLE_API_KEY está vazia ou não encontrada no arquivo .env");
        return;
    }

    try {
        console.log("Iniciando requisição para o Gemini...");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent("Diga 'Olá Mundo' em uma linha curta.");
        const response = await result.response;
        console.log("SUCESSO!!!");
        console.log("Resposta do Gemini:", response.text());
    } catch (error) {
        console.error("FALHA!!!");
        console.error(error.message);
    }
}

testGemini();
