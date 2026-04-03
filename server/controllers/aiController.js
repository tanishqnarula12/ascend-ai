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

import { GoogleGenerativeAI } from '@google/generative-ai';

// In-memory cache to strictly protect Gemini's 15 calls/minute rate limit
// Structure: Map(userId => { data: { insight, briefing, quote, etc }, timestamp: Date.now() })
const aiCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // Keep cache alive for 10 minutes per user

// Consolidated AI Fetcher
async function getCachedOrFetchGemini(userId) {
    const now = Date.now();
    const cached = aiCache.get(userId);
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

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

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using stable generation model to prevent 404 unsupported version errors
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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

        const result = await model.generateContent(prompt);
        let rawText = result.response.text().trim();
        
        // Sanitize markdown blocks if model hallucinates them
        if (rawText.startsWith('```json')) rawText = rawText.slice(7, -3).trim();
        else if (rawText.startsWith('```')) rawText = rawText.slice(3, -3).trim();

        const data = JSON.parse(rawText);
        aiCache.set(userId, { data, timestamp: now });
        return data;

    } catch (e) {
        console.error("Gemini AI Engine Generation Error:", e);
        // Instant gracefully fallback if Gemini is offline or limit hit
        return {
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
    }
}

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
