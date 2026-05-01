import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/generate-story", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY1;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY1 is not configured." });

      const { matchData } = req.body;
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Create a dramatic cricket match story summary in 3 short bullet points.

Match: ${matchData?.matchName || 'Unknown'}
Teams: ${matchData?.teamA || 'Team A'} vs ${matchData?.teamB || 'Team B'}
Venue: ${matchData?.venue || 'Unknown'}
Score: ${matchData?.score || '0/0'}
Overs: ${matchData?.overs || '0'}
Status: ${matchData?.status || 'Unknown'}
Momentum: ${matchData?.momentum || 'Unknown'}

Rules:
- Use only ${matchData?.teamA || 'Team A'} and ${matchData?.teamB || 'Team B'}.
- Do not mention GT or LSG unless they are actual teams.
- Do not invent events not present in the data.
- If data is limited, describe the story based on status and score only.
- Keep it exciting but truthful.
- No long paragraphs.

Output:
3 short bullet points only.`;

      const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
      res.json({ story: response.text });
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Failed to generate story." });
    }
  });

  app.post("/api/generate-meme", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY1;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY1 is not configured." });

      const { matchData } = req.body;
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an AI cricket entertainment assistant.
Create a short fun cricket commentary and meme caption for this live match.

Match: ${matchData?.matchName || 'Unknown'}
Teams: ${matchData?.teamA || 'Team A'} vs ${matchData?.teamB || 'Team B'}
Venue: ${matchData?.venue || 'Unknown'}
Score: ${matchData?.score || '0/0'}
Overs: ${matchData?.overs || '0'}
Status: ${matchData?.status || 'Unknown'}
Momentum: ${matchData?.momentum || 'Unknown'}

Rules:
- Use only these teams: ${matchData?.teamA || 'Team A'} and ${matchData?.teamB || 'Team B'}.
- Do not mention GT or LSG unless they are the actual teams.
- Do not invent IPL teams.
- Keep it short and fun.
- No offensive content.
- Return ONLY valid JSON, without any formatting tags or markdown.

Output format (strict JSON):
{
  "commentary": "one short line",
  "meme": "one short caption"
}`;

      const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
      const cleaned = response.text?.replace(/```json/g, "").replace(/```/g, "").trim() || "{}";
      res.json(JSON.parse(cleaned));
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Failed to generate meme." });
    }
  });

  app.post("/api/generate-tactics", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY1;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY1 is not configured." });

      const { matchData } = req.body;
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a cricket tactical assistant.
Match: ${matchData?.matchName || 'Unknown'}
Teams: ${matchData?.teamA || 'Team A'} vs ${matchData?.teamB || 'Team B'}
Venue: ${matchData?.venue || 'Unknown'}
Score: ${matchData?.score || '0/0'}
Overs: ${matchData?.overs || '0'}
Status: ${matchData?.status || 'Unknown'}
Momentum: ${matchData?.momentum || 'Unknown'}

Suggest one tactical move based only on this match context.

Rules:
- Use only ${matchData?.teamA || 'Team A'} and ${matchData?.teamB || 'Team B'}.
- Do not mention GT or LSG unless they are actual teams.
- If data is incomplete, give a general cricket tactical suggestion.
- Keep it concise.
- Return ONLY valid JSON, without any formatting tags or markdown.

Output format (strict JSON):
{
  "suggestion": "one line",
  "why": "one line"
}`;

      const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
      const cleaned = response.text?.replace(/```json/g, "").replace(/```/g, "").trim() || "{}";
      res.json(JSON.parse(cleaned));
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Failed to generate tactics." });
    }
  });

  app.post("/api/generate-sentiment", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY1;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY1 is not configured." });

      const { matchData } = req.body;
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Generate one short fan sentiment line for this cricket match.
Match: ${matchData?.matchName || 'Unknown'}
Teams: ${matchData?.teamA || 'Team A'} vs ${matchData?.teamB || 'Team B'}
Status: ${matchData?.status || 'Unknown'}
Score: ${matchData?.score || '0/0'}

Rules:
- Use only current teams.
- Do not mention GT or LSG unless they are actual teams.
- Keep it short.`;

      const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
      res.json({ sentiment: response.text });
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Failed to generate sentiment." });
    }
  });

  app.post("/api/generate-food", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY1;
      
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY1 is not configured." });
      }

      const { prompt: userPrompt, matchStatus, deliveryCity, matchData } = req.body;

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are MatchBites AI, a cricket match food companion for Indian users.

The user is watching cricket match ${matchData?.matchName || 'Unknown'}, teams ${matchData?.teamA || 'Team A'} vs ${matchData?.teamB || 'Team B'}.
Current match situation: ${matchStatus || 'Death-over pressure, fans are excited.'}
User delivery city: ${deliveryCity || 'Ahmedabad'}
User request: ${userPrompt || 'Suggest some snacks'}

Your job:
Suggest 3 exact, searchable dish names that a user can search on Zomato.

Very important rules:
- Do NOT give vague names like "spicy rolls", "snacks", "fast food".
- Give exact dish names only.
- Dish names must be common and searchable in India.
- Keep names short and specific.
- Return only valid JSON.
- No markdown.
- No explanation outside JSON.

Return JSON in this exact format:
{
  "mood": "one short match-food mood line",
  "items": [
    {
      "name": "exact searchable dish name",
      "priceEstimate": "₹ amount",
      "timeEstimate": "minutes estimate",
      "whyItFits": "one short reason",
      "searchQuery": "exact dish name + delivery city"
    }
  ],
  "comboLine": "one fun cricket-themed food line"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ result: response.text });
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Failed to generate food suggestions. Using fallback." });
    }
  });

  app.post("/api/fetch-live-matches", async (req, res) => {
    try {
      const apiKey = process.env.CRICKET_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "CRICKET_API_KEY is not configured." });
      }

      console.log("Fetching current cricket matches...");
      const apiUrl = `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`;
      const apiRes = await fetch(apiUrl);
      if (!apiRes.ok) {
        throw new Error(`API returned ${apiRes.status}`);
      }

      const data = await apiRes.json();
      console.log("Live matches received:", data.data?.length || 0);

      res.json({ matches: data.data || [] });
    } catch (error) {
      console.error("Cricket API Error:", error);
      res.status(500).json({ error: "Failed to fetch live matches." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Important: Use all for SPA handling on Express v5 or '*' for Expres v4. We have Express 4.
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
