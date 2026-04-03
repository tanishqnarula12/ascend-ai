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
        const strategies = [
            "Your peak productivity is observed between 10 AM and 2 PM.",
            "Your task completion rate drops on weekends. Consider lighter goals for leisure.",
            "You've maintained a 3-day streak! Consistency is the key to mastery.",
            "Based on your patterns, you are at risk of burnout. Schedule a break."
        ];
        res.json({
            insight: strategies[Math.floor(Math.random() * strategies.length)],
            productivity_score: Math.floor(Math.random() * (98 - 65 + 1)) + 65,
            mood_trend: "Improving"
        });
    } catch (error) {
        console.error('Insight Error:', error);
        res.status(500).json({ message: "Server error" });
    }
};

export const predictConsistency = async (req, res) => {
    try {
        res.json({
            success_probability: (Math.random() * (0.99 - 0.7) + 0.7).toFixed(2),
            recommended_difficulty: "Medium"
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const getDailyBriefing = async (req, res) => {
    try {
        const templates = [
            "Today is a high-energy day. Focus on your 'Hard' tasks before 2 PM.",
            "You have a 3-day streak going! Data suggests you're most productive when finishing small tasks first today.",
            "Your goal 'Aesthetic Physique' is 80% complete. One final push on training today will trigger a milestone!",
            "Warning: Wednesday is usually your lowest productivity day. Plan ahead to break the pattern."
        ];
        res.json({
            briefing: templates[Math.floor(Math.random() * templates.length)],
            focus_priority: "Deep Work",
            estimated_completion: "6:00 PM"
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const getMotivation = async (req, res) => {
    try {
        const quotes = [
            "The only way to do great work is to love what you do. – Steve Jobs",
            "Don't count the days, make the days count. – Muhammad Ali",
            "The secret of getting ahead is getting started. – Mark Twain",
            "Your only limit is your mind.",
            "A year from now you may wish you had started today.",
            "Discipline is doing what needs to be done, even if you don't want to do it.",
            "Small steps every day lead to big results.",
            "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill"
        ];
        res.json({
            quote: quotes[Math.floor(Math.random() * quotes.length)],
            author: "AscendAI Wisdom"
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
