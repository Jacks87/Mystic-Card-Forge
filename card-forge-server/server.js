// ==============================
// Mystic Card Forge Backend
// Author: Jackelin Britton
// ==============================

// Load environment variables from .env file
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// === CRITICAL: Ensure API key exists ===
if (!process.env.OPENAI_API_KEY) {
    console.error("❌ CRITICAL ERROR: OPENAI_API_KEY is not set in the .env file.");
    process.exit(1); 
}

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// === CORS CONFIG ===
// Allow calls from GitHub Pages (your frontend) and localhost for testing
app.use(cors({
    origin: [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://127.0.0.1:5501',
        'http://localhost:5501',
        'https://jacks87.github.io' // ✅ add your GitHub Pages domain
    ]
}));

app.use(express.json());

// =========================================================
// ENDPOINT 1: TEXT REFINEMENT (Card title/ability cleanup)
// =========================================================
app.post('/api/generate-card', async (req, res) => {
    const { currentTitle, currentAbility, manaCost } = req.body;

    const manaString = Object.entries(manaCost || {})
        .filter(([, count]) => count > 0)
        .map(([color, count]) => `${count} ${color}`)
        .join(', ');

    const prompt = `Refine the ability text and title for a trading card with:
    Title: "${currentTitle}"
    Mana Cost: ${manaString || 'No Cost'}
    Current Ability: "${currentAbility}"
    
    Return ONLY a single JSON object:
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
            temperature: 0.8
        });

        const cardDetails = JSON.parse(completion.choices[0].message.content.trim());
        res.json(cardDetails);

    } catch (error) {
        console.error("❌ GPT Text Generation Error:", error.message);
        res.status(500).json({ 
            error: "Failed to generate card details.", 
            details: error.message 
        });
    }
});

// =========================================================
// ENDPOINT 2: FULL GENERATION (Text + Image)
// =========================================================
app.post('/api/generate-full-card', async (req, res) => {
    const { prompt: userMainPrompt } = req.body; 

    if (!userMainPrompt) {
        return res.status(400).json({ error: "A prompt is required for full card generation." });
    }

    try {
        // --- Step 1: Generate Card JSON with GPT ---
        const textGenerationPrompt = `You are an expert fantasy card designer. 
        Create a unique card for: "${userMainPrompt}".
        
        Return ONLY JSON:
        {
          "name": "...",
          "rules_text": "...",
          "power": "...",
          "toughness": "...",
          "signature": "...",
          "card_color": "...",
          "mana_cost": { "white": n, "blue": n, "black": n, "red": n, "green": n, "colorless": n },
          "image_description": "..."
        }`;

        const textCompletion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: textGenerationPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.8
        });

        const cardDetails = JSON.parse(textCompletion.choices[0].message.content.trim());

        // --- Step 2: Generate Image using DALL·E ---
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
        console.error("❌ AI Full Card Generation Error:", error);

        let errorMessage = "An unexpected error occurred on the server.";
        let details = error.message;

        if (error.status === 401) {
            errorMessage = "Authentication Failed. Check your OPENAI_API_KEY.";
        } else if (error.response?.data?.error) {
            errorMessage = "Failed to generate full card with AI.";
            details = error.response.data.error.message;
        }

        res.status(500).json({ error: errorMessage, details });
    }
});

// =========================================================
// HEALTH CHECK
// =========================================================
app.get("/", (req, res) => {
  res.send("🚀 Mystic Card Forge Backend is alive!");
});

// =========================================================
// START SERVER
// =========================================================
app.listen(PORT, () => {
    console.log(`✅ Mystic Card Forge Backend running on port ${PORT}`);
});
