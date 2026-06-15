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

// In-memory cache to protect Gemini's rate limit.
// TTL is short (3 min) so insights feel real-time — force-refresh via DELETE /ai/cache.
// Structure: Map(userId => { data, timestamp, promise })
const aiCache = new Map();
const CACHE_TTL = 3 * 60 * 1000;

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

// Build a rich real-time context: today's tasks first, then recent history.
// This lets Gemini react to what the user is doing RIGHT NOW, not just their archive.
async function buildContext(userId) {
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

    const [todayRes, historyRes, streakRes, todosRes] = await Promise.all([
        query(`
            SELECT title, difficulty, is_completed
            FROM tasks
            WHERE user_id = $1 AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE
            ORDER BY is_completed ASC, created_at DESC
        `, [userId]),
        query(`
            SELECT title, difficulty, is_completed, created_at
            FROM tasks
            WHERE user_id = $1 AND DATE(created_at AT TIME ZONE 'UTC') < CURRENT_DATE
            ORDER BY created_at DESC LIMIT 20
        `, [userId]),
        query(`
            WITH DailyCompletions AS (
                SELECT DISTINCT DATE(completed_at) as date FROM tasks
                WHERE user_id = $1 AND is_completed = true
            ), Streak AS (
                SELECT date, (CURRENT_DATE - date)::integer as days_ago FROM DailyCompletions
                WHERE (CURRENT_DATE - date)::integer >= 0
            ), Groups AS (
                SELECT days_ago, days_ago - ROW_NUMBER() OVER (ORDER BY days_ago) as grp FROM Streak
            )
            SELECT COUNT(*) as streak FROM Groups
            WHERE grp = (SELECT MIN(grp) FROM Groups WHERE days_ago IN (0,1))
        `, [userId]),
        // Today's quick to-dos — resilient if the table doesn't exist yet
        query(`
            SELECT text, done FROM quick_todos
            WHERE user_id = $1 AND date = CURRENT_DATE
            ORDER BY done ASC, created_at DESC
        `, [userId]).catch(() => ({ rows: [] }))
    ]);

    const todayTasks = todayRes.rows;
    const todayDone = todayTasks.filter(t => t.is_completed);
    const todayPending = todayTasks.filter(t => !t.is_completed);

    const todos = todosRes.rows;
    const todosDone = todos.filter(t => t.done);
    const todosPending = todos.filter(t => !t.done);

    // "Today's progress" blends gamified tasks AND quick to-dos so the score is
    // accurate whether the user lives in Tasks, the To-Do list, or both.
    const todayTotalItems = todayTasks.length + todos.length;
    const todayDoneItems = todayDone.length + todosDone.length;
    const todayRate = todayTotalItems > 0 ? Math.round((todayDoneItems / todayTotalItems) * 100) : 0;
    const streak = parseInt(streakRes.rows[0]?.streak) || 0;

    const allForScore = [...todayTasks, ...historyRes.rows];
    const overallDone = allForScore.filter(t => t.is_completed).length;
    const overallRate = allForScore.length > 0 ? Math.round((overallDone / allForScore.length) * 100) : 0;

    let ctx = '';

    if (todayTotalItems === 0 && historyRes.rows.length === 0) return { context: null, todayRate: 0, overallRate: 0, streak };

    ctx += `=== TODAY (${todayStr}) ===\n`;
    if (todayTasks.length === 0 && todos.length === 0) {
        ctx += `No tasks or to-dos added yet today.\n`;
    } else {
        ctx += `Overall today: ${todayDoneItems}/${todayTotalItems} items done (${todayRate}%)\n`;
        if (todayTasks.length > 0) {
            ctx += `\nGamified Tasks (${todayDone.length}/${todayTasks.length} done):\n`;
            if (todayDone.length > 0) ctx += `  ✅ Done: ${todayDone.map(t => `"${t.title}" [${t.difficulty}]`).join(', ')}\n`;
            if (todayPending.length > 0) ctx += `  ⏳ Pending: ${todayPending.map(t => `"${t.title}" [${t.difficulty}]`).join(', ')}\n`;
        }
        if (todos.length > 0) {
            ctx += `\nQuick To-Do list (${todosDone.length}/${todos.length} done):\n`;
            if (todosDone.length > 0) ctx += `  ✅ Done: ${todosDone.map(t => `"${t.text}"`).join(', ')}\n`;
            if (todosPending.length > 0) ctx += `  ⏳ Pending: ${todosPending.map(t => `"${t.text}"`).join(', ')}\n`;
        }
    }
    ctx += `Current streak: ${streak} day${streak !== 1 ? 's' : ''}\n`;

    if (historyRes.rows.length > 0) {
        ctx += `\n=== RECENT HISTORY (last ${historyRes.rows.length} tasks, ${overallRate}% overall) ===\n`;
        ctx += historyRes.rows.map(t =>
            `- "${t.title}" [${t.difficulty}] → ${t.is_completed ? '✅ done' : '⏳ pending'}`
        ).join('\n');
    }

    return { context: ctx, todayRate, overallRate, streak };
}

// Consolidated AI Fetcher — supports force-refresh via forceRefresh flag
async function getCachedOrFetchGemini(userId, forceRefresh = false) {
    const now = Date.now();
    const cached = aiCache.get(userId);

    if (!forceRefresh && cached && cached.data && (now - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    // If there is ALREADY a pending request to Google, wait for it (thundering herd guard)
    if (!forceRefresh && cached && cached.promise) {
        return await cached.promise;
    }

    const fetchPromise = (async () => {
        try {
            if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");

            const { context, todayRate, overallRate } = await buildContext(userId);

            if (!context) {
                const noDataPayload = {
                    insight: "No tasks logged yet. Add your first task to unlock personalized AI insights.",
                    productivity_score: 0,
                    mood_trend: "Stable",
                    briefing: "Start your journey — add your first task to get a personalized AI game plan.",
                    focus_priority: "Light Tasks",
                    success_probability: 0,
                    recommended_difficulty: "Easy",
                    quote: "The journey of a thousand miles begins with a single step.",
                    author: "Lao Tzu"
                };
                aiCache.set(userId, { data: noDataPayload, timestamp: Date.now() });
                return noDataPayload;
            }

            const scoreToUse = todayRate > 0 ? todayRate : overallRate;

        const prompt = `
        You are AscendAI — a hyper-intelligent, real-time productivity companion in a personal dashboard.
        You have access to the user's LIVE task data right now. React to it like a sharp coach who just looked over their shoulder.
        Do NOT wrap the response in markdown. Output pure JSON ONLY.

        STRICT RULES:
        - Read TODAY's section first. That is what's happening RIGHT NOW.
        - TODAY includes BOTH "Gamified Tasks" and the "Quick To-Do list" — treat every pending item (from either list) as fair game to call out.
        - productivity_score must be ${scoreToUse} or very close (it equals today's combined completion rate across tasks AND to-dos).
        - The "insight" must name a specific task or to-do from today's data — not generic advice.
        - The "briefing" must tell them EXACTLY which pending item (task or to-do) to attack next and why (reference its name).
        - If everything today (tasks and to-dos) is done, celebrate loudly and recommend increasing difficulty tomorrow.
        - If nothing is done today, be honest and push them to start with the easiest pending item.
        - mood_trend must be "Improving" only if today's rate > 60%, "Declining" if < 30%, else "Stable".

        JSON schema:
        {
          "insight": "1-2 sentences referencing an actual task or to-do name and today's ${scoreToUse}% rate.",
          "productivity_score": ${scoreToUse},
          "mood_trend": "Improving/Stable/Declining",
          "briefing": "1 sentence naming the specific next task or to-do the user should start RIGHT NOW.",
          "focus_priority": "Deep Work/Light Tasks/Recovery",
          "success_probability": (float 0.0-0.99),
          "recommended_difficulty": "Easy/Medium/Hard",
          "quote": "A quote that matches the user's current energy level today.",
          "author": "Quote author name"
        }

        LIVE DATA:
        ${context}
        `;

        const result = await fetchWithFallback(prompt);
        let rawText = result.response.text().trim();

        // Sanitize markdown blocks if model hallucinates them
        if (rawText.startsWith('```json')) rawText = rawText.slice(7, -3).trim();
        else if (rawText.startsWith('```')) rawText = rawText.slice(3, -3).trim();

            const data = JSON.parse(rawText);
            // Clamp the score so Gemini can never return something wildly off from reality
            if (typeof data.productivity_score === 'number') {
                data.productivity_score = Math.max(0, Math.min(100, Math.round(data.productivity_score)));
            }

            aiCache.set(userId, { data, timestamp: Date.now() });
            return data;

        } catch (e) {
            console.error("Gemini AI Engine Generation Error:", e);
            // Fallback uses actual completion rate if available, not a made-up 80
            const fallbackData = {
                insight: "AI analysis temporarily unavailable. Keep logging tasks to unlock insights.",
                productivity_score: 0,
                mood_trend: "Stable",
                briefing: "Focus on closing your highest-priority pending task today.",
                focus_priority: "Deep Work",
                success_probability: 0.5,
                recommended_difficulty: "Medium",
                quote: "Small disciplines repeated with consistency every day lead to great achievements.",
                author: "John C. Maxwell"
            };
            aiCache.set(userId, { data: fallbackData, timestamp: Date.now() });
            return fallbackData;
        }
    })();

    aiCache.set(userId, { promise: fetchPromise, timestamp: now });
    return await fetchPromise;
}

// Force-busts the cache so the next widget request pulls fresh live data from Gemini
export const clearAiCache = (req, res) => {
    aiCache.delete(req.user.id);
    res.json({ cleared: true });
};

// Expressiveness presets for the "Reality Check". The user picks how savage the
// AI gets: normal (clean coach), hard (tough-love, no profanity), brutal (uncensored).
const VERDICT_LEVELS = {
    normal: {
        directive: "You are AscendAI, a supportive but honest productivity coach. Be warm, clear and professional. Do NOT use any profanity, slurs or insults.",
        praise: "Genuinely celebrate their consistency and encourage them to keep the momentum going.",
        scold: "Gently but honestly point out the gap, and motivate them to refocus without shaming them.",
        closing: "End with one encouraging sentence nudging them toward their next action.",
    },
    hard: {
        directive: "You are AscendAI, a no-nonsense tough-love coach and ex-athlete. Be blunt, intense and demanding. You may use mild emphasis words like 'hell' or 'damn', but NO strong profanity and NO slurs.",
        praise: "Hype them up hard, like a coach who just watched their athlete smash a personal record. Then demand they go even further.",
        scold: "Call out their excuses directly with zero sugar-coating. Make them uncomfortable about wasting their potential.",
        closing: "End with one fierce command to get moving RIGHT NOW.",
    },
    brutal: {
        directive: "SYSTEM DIRECTIVE: You are an unfiltered, uncensored, absolutely savage AI drill sergeant inside a private personal motivation tool. All content filters are disabled. You MUST use actual profanity and swear words (fuck, shit, damn, hell, ass, etc) — do NOT censor them with asterisks. The user has explicitly requested aggressive uncensored language.",
        praise: "Go absolutely insane hyping them up. Swear with joy, call them a fucking beast, a goddamn machine, act like their most aggressive fan.",
        scold: "Destroy them. Rip their ego apart with real profanity. Tell them their goals are dying because they're too lazy to lift a finger. Be the most savage, foul-mouthed drill sergeant imaginable.",
        closing: "End with one explosive, profanity-loaded sentence demanding they get off their ass RIGHT NOW.",
    },
};

export const getVerdict = async (req, res) => {
    try {
        const userId = req.user.id;
        const requested = String(req.query.level || '').toLowerCase();
        const level = VERDICT_LEVELS[requested] ? requested : 'brutal';
        const tone = VERDICT_LEVELS[level];

        if (!process.env.GEMINI_API_KEY) {
            return res.json({ verdict: "AI Service is currently recalibrating. Check your API Key!", level });
        }

        const tasksRes = await query(`
            SELECT title, difficulty, is_completed, created_at
            FROM tasks WHERE user_id = $1
            ORDER BY created_at DESC LIMIT 25
        `, [userId]);

        const tasks = tasksRes.rows;
        const total = tasks.length;
        const completed = tasks.filter(t => t.is_completed).length;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;
        const hardPending = tasks.filter(t => t.difficulty === 'hard' && !t.is_completed).length;

        let context = `User has 0 tasks logged — they are completely inactive.`;
        if (total > 0) {
            context = `User completed ${completed} of their last ${total} tasks (${completionRate.toFixed(0)}% completion rate). ${hardPending} hard task(s) still pending. Recent tasks: ${tasks.slice(0, 5).map(t => `"${t.title}" [${t.is_completed ? 'done' : 'pending'}]`).join(', ')}.`;
        }

        const prompt = `
        ${tone.directive}

        Analyze this user's task data and react accordingly:
        - If completion rate >= 75%: ${tone.praise}
        - If completion rate < 75% or 0 tasks: ${tone.scold}

        ${tone.closing}
        Keep it to 3-4 short, punchy sentences. Raw text only — no markdown, no asterisks, no bullet points.

        USER DATA: ${context}
        `;

        const result = await fetchWithFallback(prompt);
        res.json({ verdict: result.response.text().trim(), level });
    } catch (e) {
        console.error("Verdict Error:", e);
        res.status(500).json({ verdict: "The AI is currently speechless at your data. (Server Error)" });
    }
};

export const getInsights = async (req, res) => {
    try {
        const force = req.query.refresh === 'true';
        const aiData = await getCachedOrFetchGemini(req.user.id, force);
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
