const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const extractionPrompt = `
Extract the following details from the expense report in JSON format:
- item: Name of the material/service
- price: Cost (number only)
- quantity: Amount bought (string with unit, e.g., "10 un", "50kg")
- category: Construction category (e.g., Hidraulica, Eletrica, Alvenaria, Pintura)
- project: Name of the construction site (Obra) based on context.

If any field is missing, use "N/A" or 0.
Return ONLY raw JSON, no markdown formatting.
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
        console.error("Gemini Text Error:", error);
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
