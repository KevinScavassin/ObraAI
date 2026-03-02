const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const extractionPrompt = `
Extraia os seguintes detalhes do relato de gasto no formato JSON:
- data: Data da compra (Somente Date no formato YYYY-MM-DD). Use a data de hoje caso não especificada: ${new Date().toISOString().split('T')[0]}.
- item: Nome do material ou serviço
- valor: Custo da compra (somente número, use ponto para decimais)
- quantidade: Quantidade comprada (somente número)
- categoria: Categoria do gasto. Tente encaixar em uma destas: "Materiais Básicos", "Estrutural", "Acabamento", "Terreno", "Alvenaria", "Mão de Obra", "Elétrica", "Hidráulica", "Projetos", "Taxas e Impostos", "Fundação", "Esquadrias", "Marcenaria", "Paisagismo", "Lazer", "Consumo", "Equipamentos".
- subcategoria: Subcategoria do item. Tente encaixar em uma destas: "Areia", "Treliça", "Piso", "N/A", "Tijolo", "Pagamento Pedreiro", "Fio", "Cano", "arquiteto", "registros em cartorio", "Terraplanagem", "Janelas", "Armario", "Portas", "jardim", "Piscina", "quadra de areia", "condominio", "agua", "luz", "aluguel de maquina", "caçambas". Se for terreno ou não aplicável usar "N/A".
- projeto: Nome da obra ou projeto (obtenha a partir do fim do audio/mensagem, o que sobrar)

Se algum campo estiver faltando e não puder ser deduzido, use "N/A" ou 0 para números.
Retorne SOMENTE o JSON cru, sem formatação markdown ou blocos de código "json".
`;

// Helper to download media from Meta
// Requires 2 steps: GET URL from ID -> GET Binary from URL
async function downloadMetaMedia(mediaId) {
    try {
        // Step 1: Get the Media URL
        const urlRes = await axios.get(
            `https://graph.facebook.com/v21.0/${mediaId}`,
            {
                headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` }
            }
        );
        const mediaUrl = urlRes.data.url;

        // Step 2: Download the binary data
        const binaryRes = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` }
        });

        return Buffer.from(binaryRes.data);
    } catch (error) {
        console.error("Error downloading media from Meta:", error.message);
        throw error;
    }
}

async function parseText(text) {
    try {
        const prompt = `${extractionPrompt}\nText: "${text}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        const cleanJson = textResponse.replace(/^```json\n|```$/g, '');
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("❌ ERRO DETALHADO EM parseText (Gemini Text Error):");
        console.error("➡ Mensagem:", error.message);
        console.error("➡ Status da Requisição:", error.status || "N/A");

        // Verifica se o erro possui detalhes da resposta HTTP original da API
        if (error.response) {
            console.error("➡ Resposta da API:", error.response);
        }

        // Erros do próprio SDK do Google muitas vezes possuem um array de custom details
        if (error.details) {
            console.error("➡ Detalhes do Erro:", error.details);
        }

        console.error("➡ Stack Trace:", error.stack);
        return null;
    }
}

async function parseAudio(mediaId, mimeType) {
    try {
        console.log(`Downloading audio ID: ${mediaId}...`);
        const audioBuffer = await downloadMetaMedia(mediaId);

        // Convert to base64
        const audioBase64 = audioBuffer.toString('base64');

        const parts = [
            {
                inlineData: {
                    mimeType: mimeType, // Gemini handles 'audio/ogg' well
                    data: audioBase64
                }
            },
            { text: extractionPrompt }
        ];

        const result = await model.generateContent({
            contents: [{ role: "user", parts }]
        });

        const response = await result.response;
        const textResponse = response.text();
        const cleanJson = textResponse.replace(/^```json\n|```$/g, '');
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Gemini Audio Error:", error);
        return null;
    }
}

module.exports = { parseText, parseAudio };
