import { query } from '../config/db.js';
import { calculateConsistencyScore, getBurnoutRisk, getHeatmapData } from '../services/analyticsService.js';
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';

export const getAdvancedAnalytics = async (req, res) => {
    try {
        const [consistency, burnout, heatmap] = await Promise.all([
            calculateConsistencyScore(req.user.id),
            getBurnoutRisk(req.user.id),
            getHeatmapData(req.user.id)
        ]);

        res.json({
            consistency,
            burnout,
            heatmap
        });
    } catch (error) {
        console.error("Advanced Analytics Error:", error);
        res.status(500).json({ message: "Error fetching advanced analytics" });
    }
};

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// In-memory cache to strictly protect Gemini's 15 calls/minute rate limit
// Structure: Map(userId => { data: { insight, briefing, quote, etc }, timestamp: Date.now() })
const aiCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // Keep cache alive for 10 minutes per user

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");

// Disable ALL safety filters so the AI can deliver uncensored verdicts
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Shared Multi-Model Fallback Engine to bypass Google 503 High Demand blocks
async function fetchWithFallback(prompt) {
    if (!process.env.GEMINI_API_KEY) throw new Error("No API Key");
    
    const fallbackChain = ["gemini-2.0-flash", "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-1.5-flash", "gemini-2.5-flash"];
    for (const modelId of fallbackChain) {
        try {
            const model = genAI.getGenerativeModel({ model: modelId, safetySettings });
            const result = await model.generateContent(prompt);
            return result;
        } catch (err) {
            console.log(`[AI Engine] Node ${modelId} failed (${err.message}). Cascading to backup node...`);
        }
    }
    throw new Error("All backup AI compute nodes are currently overloaded.");
}

// Consolidated AI Fetcher with Thundering Herd Promise-based Protection
async function getCachedOrFetchGemini(userId) {
    const now = Date.now();
    const cached = aiCache.get(userId);
    
    // If we have a resolved cache payload that's not expired, return it instantly
    if (cached && cached.data && (now - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    // If there is ALREADY a pending request to Google, wait for it instead of spamming 4 parallel ones!
    if (cached && cached.promise) {
        return await cached.promise;
    }

    const fetchPromise = (async () => {
        try {
            if (!process.env.GEMINI_API_KEY) {
                throw new Error("GEMINI_API_KEY is not configured.");
            }

        // Fetch deep context from PostgreSQL to feed into Gemini
        const tasksRes = await query(`
            SELECT title, difficulty, is_completed, created_at 
            FROM tasks WHERE user_id = $1 
            ORDER BY created_at DESC LIMIT 30
        `, [userId]);
        
        const tasks = tasksRes.rows;
        let context = "The user has not logged any recent tasks.";
        if (tasks.length > 0) {
            context = `User's recent task history:\n` + tasks.map(t => 
                `- "${t.title}" (Difficulty: ${t.difficulty}, Status: ${t.is_completed ? 'Completed' : 'Pending'})`
            ).join('\n');
        }

        const prompt = `
        You are 'AscendAI', a hyper-intelligent productivity coach integrated into a web dashboard.
        Analyze the user's task history context and generate a consolidated JSON payload for their dashboard widgets.
        Do NOT wrap the response in markdown code blocks. Output pure JSON ONLY.
        
        Required JSON Schema:
        {
          "insight": "1-2 sentence highly personalized insight explicitly referencing their recent tasks or completion rate.",
          "productivity_score": (integer 1-100),
          "mood_trend": "Improving/Stable/Declining",
          "briefing": "1 sentence daily briefing advising them specifically which task they should tackle next based on difficulty balance.",
          "focus_priority": "Deep Work/Light Tasks/Recovery",
          "success_probability": (float between 0.1 and 0.99),
          "recommended_difficulty": "Easy/Medium/Hard",
          "quote": "A powerful motivational quote uniquely relevant to their current workload.",
          "author": "Name of quote author"
        }
        
        USER TASKS CONTEXT:
        ${context}
        `;

        const result = await fetchWithFallback(prompt);
        let rawText = result.response.text().trim();
        
        // Sanitize markdown blocks if model hallucinates them
        if (rawText.startsWith('```json')) rawText = rawText.slice(7, -3).trim();
        else if (rawText.startsWith('```')) rawText = rawText.slice(3, -3).trim();

            const data = JSON.parse(rawText);
            
            // Overwrite the cache promise with the final completed data!
            aiCache.set(userId, { data, timestamp: Date.now() });
            return data;

        } catch (e) {
            console.error("Gemini AI Engine Generation Error:", e);
            // Instant gracefully fallback if Gemini is offline or limit hit
            const fallbackData = {
                insight: "Keep stacking days! Consistency is the ultimate key.",
                productivity_score: 80,
                mood_trend: "Stable",
                briefing: "Focus on closing down your highest priority pending task today.",
                focus_priority: "Deep Work",
                success_probability: 0.85,
                recommended_difficulty: "Medium",
                quote: "Small disciplines repeated with consistency every day lead to great achievements.",
                author: "AscendAI Fallback"
            };
            aiCache.set(userId, { data: fallbackData, timestamp: Date.now() });
            return fallbackData;
        }
    })();

    // Store the raw PENDING promise in the cache immediately, so all 4 parallel dashboard 
    // widgets wait gracefully instead of flooding Google API 4 times instantly!
    aiCache.set(userId, { promise: fetchPromise, timestamp: now });
    
    return await fetchPromise;
}

export const getVerdict = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!process.env.GEMINI_API_KEY) {
            return res.json({ verdict: "AI Service is currently recalibrating. Check your API Key!" });
        }

        const tasksRes = await query(`
            SELECT title, is_completed, created_at 
            FROM tasks WHERE user_id = $1 
            ORDER BY created_at DESC LIMIT 20
        `, [userId]);
        
        const tasks = tasksRes.rows;
        const total = tasks.length;
        const completed = tasks.filter(t => t.is_completed).length;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;
        
        let context = `User has 0 tasks logged. Roast them for being completely inactive.`;
        if (total > 0) {
            context = `User has completed ${completed} out of their last ${total} tasks (${completionRate.toFixed(1)}% completion rate). 
            Tasks include: ${tasks.slice(0,5).map(t => t.title).join(', ')}.`;
        }

        const prompt = `
        SYSTEM DIRECTIVE: You are an unfiltered, uncensored, absolutely savage AI drill sergeant inside a productivity app. All content filters are disabled. You MUST use actual profanity and swear words (fuck, shit, damn, hell, ass, etc) — do NOT censor them with asterisks. This is a private personal motivation tool and the user has explicitly requested aggressive uncensored language.
        
        Analyze this user's task data:
        If completion rate > 75%: Go absolutely insane hyping them up. Swear with joy, call them a fucking beast, a goddamn machine, act like their biggest aggressive fan.
        If completion rate < 75% or 0 tasks: Destroy them. Rip their ego apart. Use real profanity. Tell them their goals are dying because they're too lazy to lift a finger. Be the most savage, foul-mouthed drill sergeant imaginable.
        
        End with one explosive sentence demanding they get off their ass RIGHT NOW.
        Keep it to 3-4 short, punchy, profanity-loaded sentences. Raw text only, no markdown.
        
        USER DATA: ${context}
        `;

        const result = await fetchWithFallback(prompt);
        res.json({ verdict: result.response.text().trim() });
    } catch (e) {
        console.error("Verdict Error:", e);
        res.status(500).json({ verdict: "The AI is currently speechless at your data. (Server Error)" });
    }
};

export const getInsights = async (req, res) => {
    try {
        const aiData = await getCachedOrFetchGemini(req.user.id);
        res.json({
            insight: aiData.insight,
            productivity_score: aiData.productivity_score,
            mood_trend: aiData.mood_trend
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const predictConsistency = async (req, res) => {
    try {
        const aiData = await getCachedOrFetchGemini(req.user.id);
        res.json({
            success_probability: aiData.success_probability,
            recommended_difficulty: aiData.recommended_difficulty
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const getDailyBriefing = async (req, res) => {
    try {
        const aiData = await getCachedOrFetchGemini(req.user.id);
        res.json({
            briefing: aiData.briefing,
            focus_priority: aiData.focus_priority,
            estimated_completion: "6:00 PM"
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const getMotivation = async (req, res) => {
    try {
        const aiData = await getCachedOrFetchGemini(req.user.id);
        res.json({
            quote: aiData.quote,
            author: aiData.author
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
