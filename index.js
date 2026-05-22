import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: GEMINI_API_KEY is missing from your .env file!");
    process.exit(1); 
}

const app = express();
const port = process.env.PORT || 3000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(express.static('public'));
app.use(express.json());

app.post('/api/recipe', async (req, res) => {
    try {
        const { ingredients, isRegenerate, preference, notes } = req.body;
        
        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({ error: "Please add at least one ingredient item." });
        }

        const formattedIngredients = ingredients
            .map(item => {
                const qty = item.quantity ? item.quantity.trim() : '';
                const name = item.name ? item.name.trim() : 'Unknown ingredient';
                return qty ? `${qty} of ${name}` : name;
            })
            .join(', ');

        console.log(`🍳 Request received | Preference: "${preference || 'None'}" | Notes: "${notes || 'None'}"`);

        let prompt = `You are a professional Michelin-star chef. Create a magnificent, realistic recipe using these available ingredients and exact measurements: ${formattedIngredients}. 
        Provide a clear Recipe Name, Prep Time, clear Step-by-Step Instructions, and rough Calories/Macros. Do not assume any major ingredients are available outside basic pantry staples like oil, water, salt, and pepper.`;

        if (preference) {
            prompt += ` \n\nFLAVOR PROFILE REQUIREMENT: Tailor this recipe to this custom preference style: "${preference}".`;
        }

        if (isRegenerate) {
            prompt += ` \n\nCRITICAL ALTERNATIVE OPTION REQUIRED: The user did NOT like the previous dish suggestion. Create a completely DIFFERENT, alternative meal structure using these same ingredients. Do not repeat the same recipe style or name.`;
            
            if (notes) {
                prompt += ` \n\nUSER CRITICAL CONSTRAINT NOTICES: The user has explicitly submitted these additional restrictions or contextual updates regarding their current cooking situation: "${notes}". 
                
                You MUST strictly adapt the recipe to conform to these updates. For example, if they mention they do not have oil, salt, or pepper, you are forbidden from utilizing those elements anywhere within the recipe steps or details.
                
                NEW MANDATORY INTRO RULE: Start the very first sentence of your conversational introduction paragraph by explicitly calling out and addressing the user's adjustments. For example, open up with something natural like: "Since you don't have pepper on hand, I've designed a magnificent alternative that highlights..." or "Adjusting for your lack of oil, let's create a healthy steam style..." Make sure it matches whatever condition they typed into the text block: "${notes}".`;
            }
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        if (!response || !response.text) {
            throw new Error("Empty response object received from Gemini API.");
        }

        res.json({ recipe: response.text });

    } catch (error) {
        console.error("❌ BACKEND AI CRASH DETECTED:");
        console.error(error);
        res.status(500).json({ error: "AI execution failed. See terminal logs." });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server is successfully running!`);
    console.log(`👉 Access on PC: http://localhost:${port}`);
});