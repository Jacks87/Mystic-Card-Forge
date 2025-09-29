// Load environment variables from .env file
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// === REVISION 1: CRITICAL API KEY CHECK ===
if (!process.env.OPENAI_API_KEY) {
    console.error("CRITICAL ERROR: OPENAI_API_KEY is not set in the .env file.");
    // Exit the process if the key is missing, preventing runtime errors.
    process.exit(1); 
}
// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// IMPORTANT: Configure CORS to allow access from your Live Server port (e.g., 5500 or 5501)
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:5501', 'http://localhost:5501']
}));

app.use(express.json());

// =========================================================
// ENDPOINT 1: TEXT REFINEMENT (Original Functionality)
// Takes existing card inputs and refines the title/ability.
// =========================================================
app.post('/api/generate-card', async (req, res) => {
    const { currentTitle, currentAbility, manaCost } = req.body;

    const manaString = Object.entries(manaCost)
        .filter(([, count]) => count > 0)
        .map(([color, count]) => `${count} ${color}`)
        .join(', ');

    const prompt = `Refine the ability text and title for a trading card with the following details. 
    Title: "${currentTitle}"
    Mana Cost: ${manaString || 'No Cost'}
    Current Ability: "${currentAbility}"
    
    The output MUST ONLY be a single JSON object (no markdown formatting) that is strictly parsable, containing:
    "name": "string" (the refined title),
    "rules_text": "string" (the refined ability text),
    "power": "string" (creature power, e.g., "3"),
    "toughness": "string" (creature toughness, e.g., "4").
    Infer the power/toughness based on the current text and mana cost.`;

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
        console.error("GPT Text Generation Error:", error.message);
        res.status(500).json({ error: "Failed to generate card details.", details: error.message });
    }
});


// =========================================================
// ENDPOINT 2: FULL GENERATION (Text + Image)
// Takes a simple prompt and generates all card fields plus art.
// =========================================================
app.post('/api/generate-full-card', async (req, res) => {
    const { prompt: userMainPrompt } = req.body; 

    if (!userMainPrompt) {
        return res.status(400).json({ error: "A prompt is required for full card generation." });
    }

    try {
        // --- Step 1: Generate Card Text Details + Image Prompt using GPT ---
        const textGenerationPrompt = `You are an expert fantasy card designer. Create a unique card based on the concept: "${userMainPrompt}".
        
        The output MUST ONLY be a single JSON object that is strictly parsable. It needs the following fields:
        "name": "string" (the card's name),
        "rules_text": "string" (the ability text),
        "power": "string or number" (power),
        "toughness": "string or number" (toughness),
        "signature": "string" (artist signature/flavor text),
        "card_color": "string" (a hex color for the card's background, e.g., "#008000" for Green, "#B22222" for Red, "#A9A9A9" for Colorless),
        "mana_cost": { "white": number, "blue": number, "black": number, "red": number, "green": number, "colorless": number } (mana values),
        "image_description": "string" (a detailed, evocative prompt for DALL-E, e.g., "A muscular warrior fighting a hydra in a glowing cavern, fantasy concept art").`;
        
        const textCompletion = await openai.chat.completions.create({
            model: 'gpt-4o', // Using gpt-4o for better structured JSON output
            messages: [{ role: 'user', content: textGenerationPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.8
        });

        const cardDetails = JSON.parse(textCompletion.choices[0].message.content.trim());

        // --- Step 2: Generate Image using DALL-E 3 ---
        const imageResponse = await openai.images.generate({
            model: "dall-e-3", 
            prompt: cardDetails.image_description, 
            n: 1, 
            size: "1024x1024", 
            quality: "standard"
        });

        const imageUrl = imageResponse.data[0].url;

        // --- Step 3: Combine and Send Back ---
        cardDetails.image_url = imageUrl; 

        res.json(cardDetails);

    } catch (error) {
        console.error("AI Full Card Generation Error:", error); // Log the full error object
        
        // === REVISION 2: MORE ROBUST ERROR HANDLING ===
        let errorMessage = "An unexpected error occurred on the server.";
        let details = error.message;

        if (error.status === 401) {
            errorMessage = "Authentication Failed. Check your OPENAI_API_KEY.";
        } else if (error.response && error.response.data && error.response.data.error) {
            errorMessage = "Failed to generate full card with AI. (DALL-E/GPT Error)";
            details = error.response.data.error.message;
        }

        res.status(500).json({ 
            error: errorMessage,
            details: details
        });
    }
});

// Health check route
app.get("/", (req, res) => {
  res.send("🚀 Mystic Card Forge Backend is alive!");
});

// Start the server
app.listen(PORT, () => {
    console.log(`Mystic Card Forge Backend running on port ${PORT}`);
});
