// =========================================================
// Mystic Card Forge Backend
// Owner: Jackelin Britton
// ChatGPT only assisted with debugging and structuring code.
// Last update: 9/28/2025 - Fixed CORS for GitHub Pages + cleaner error handling
// =========================================================

// Load environment variables
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// === CRITICAL: Check API Key ===
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ CRITICAL ERROR: OPENAI_API_KEY missing in .env file!");
  process.exit(1); // Exit app if no key set
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === CORS SETTINGS ===
// Allow requests from local dev and GitHub Pages
app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    "https://jacks87.github.io"   // ✅ Your GitHub Pages domain
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// =========================================================
// ENDPOINT 1: Refine Card Details
// =========================================================
app.post('/api/generate-card', async (req, res) => {
  const { currentTitle, currentAbility, manaCost } = req.body;

  const manaString = Object.entries(manaCost || {})
    .filter(([, count]) => count > 0)
    .map(([color, count]) => `${count} ${color}`)
    .join(', ');

  const prompt = `Refine the ability text and title for a trading card:
  Title: "${currentTitle}"
  Mana Cost: ${manaString || 'No Cost'}
  Ability: "${currentAbility}"

  Respond ONLY with a JSON object:
  {
    "name": "...",
    "rules_text": "...",
    "power": "...",
    "toughness": "..."
  }`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const cardDetails = JSON.parse(completion.choices[0].message.content.trim());
    res.json(cardDetails);

  } catch (error) {
    console.error("⚠️ Error refining card:", error.message);
    res.status(500).json({
      error: "Failed to generate card details.",
      details: error.message
    });
  }
});

// =========================================================
// ENDPOINT 2: Full Card Generation (Text + Image)
// =========================================================
app.post('/api/generate-full-card', async (req, res) => {
  const { prompt: userMainPrompt } = req.body;

  if (!userMainPrompt) {
    return res.status(400).json({ error: "A prompt is required for full card generation." });
  }

  try {
    // Step 1: Generate text + image description
    const textPrompt = `You are a fantasy trading card designer. 
    Concept: "${userMainPrompt}"

    Respond ONLY with a JSON object:
    {
      "name": "...",
      "rules_text": "...",
      "power": "...",
      "toughness": "...",
      "signature": "...",
      "card_color": "#hexcolor",
      "mana_cost": { "white":0, "blue":0, "black":0, "red":0, "green":0, "colorless":0 },
      "image_description": "..."
    }`;

    const textCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: textPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.8
    });

    const cardDetails = JSON.parse(textCompletion.choices[0].message.content.trim());

    // Step 2: Generate Image with DALL·E 3
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: cardDetails.image_description,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });

    cardDetails.image_url = imageResponse.data[0].url;

    res.json(cardDetails);

  } catch (error) {
    console.error("⚠️ Full card generation error:", error);

    let errorMessage = "An error occurred while generating the card.";
    if (error.status === 401) {
      errorMessage = "Authentication failed. Check your OPENAI_API_KEY.";
    } else if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message
    });
  }
});

// =========================================================
// Health Check Route
// =========================================================
app.get("/", (req, res) => {
  res.send("🚀 Mystic Card Forge Backend is alive!");
});

// =========================================================
// Start Server
// =========================================================
app.listen(PORT, () => {
  console.log(`✅ Mystic Card Forge Backend running on port ${PORT}`);
});
