const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const axios = require('axios');
const aiService = require('./services/aiService');
const sheetService = require('./services/sheetService');

dotenv.config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;

// 1. Verification Endpoint (Required by Meta)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// 2. Message Handler (POST)
app.post('/webhook', async (req, res) => {
  const body = req.body;

  // Check if this is an event from a WhatsApp API
  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const type = message.type;

      console.log(`Received ${type} from ${from}`);

      try {
        let parsedData = null;

        if (type === 'text') {
          const text = message.text.body;
          parsedData = await aiService.parseText(text);
        } else if (type === 'audio') {
          const mediaId = message.audio.id;
          const mimeType = message.audio.mime_type; // e.g. audio/ogg; codecs=opus
          parsedData = await aiService.parseAudio(mediaId, mimeType);
        } else if (type === 'image') {
          // Optional: Image handling
          console.log('Image received (not implemented yet)');
        }

        if (parsedData) {
          console.log('Parsed Data:', parsedData);
          await sheetService.addRow(parsedData);
          await sendWhatsAppMessage(from, `✅ Gasto registrado!\nItem: ${parsedData.item}\nValor: ${parsedData.price}\nObra: ${parsedData.project}`);
        } else {
          await sendWhatsAppMessage(from, '❌ Não entendi. Tente áudio ou texto: "Comprei x por y para obra z".');
        }

      } catch (error) {
        console.error('Error processing:', error);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Helper to send message back
async function sendWhatsAppMessage(to, text) {
  try {
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        text: { body: text }
      }
    });
  } catch (error) {
    console.error('Error sending message:', error.response ? error.response.data : error.message);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
