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

export const getInsights = async (req, res) => {
    try {
        // Mock data if AI service is not running
        if (!process.env.AI_SERVICE_URL) {
            return res.json({ message: "AI Service URL not configured", insight: "Keep going! Consistency is key." });
        }

        const response = await fetchWithTimeout(`${process.env.AI_SERVICE_URL}/insights`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: req.user.id }),
        });

        if (!response.ok) {
            throw new Error(`AI Service responded with ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('AI Service Connection Error:', {
            message: error.message,
            url: process.env.AI_SERVICE_URL,
            stack: error.stack
        });
        // Fallback to neutral data if AI service is down
        res.json({
            insight: "Keep up the momentum! You're doing great.",
            productivity_score: 0
        });
    }
};

export const predictConsistency = async (req, res) => {
    try {
        if (!process.env.AI_SERVICE_URL) {
            return res.json({ prediction: 75 });
        }

        const response = await fetchWithTimeout(`${process.env.AI_SERVICE_URL}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        });

        if (!response.ok) {
            throw new Error(`AI Service responded with ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('AI Service Error:', error);
        res.json({ prediction: 0 });
    }
};

export const getDailyBriefing = async (req, res) => {
    try {
        if (!process.env.AI_SERVICE_URL) {
            return res.json({ briefing: "Start your day with intent." });
        }

        const response = await fetchWithTimeout(`${process.env.AI_SERVICE_URL}/briefing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: req.user.id }),
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.json({ briefing: "Focus on your most impactful task today." });
    }
};
