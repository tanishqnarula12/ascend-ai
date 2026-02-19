export const getInsights = async (req, res) => {
    try {
        // Mock data if AI service is not running
        if (!process.env.AI_SERVICE_URL) {
            return res.json({ message: "AI Service URL not configured", insight: "Keep going! Consistency is key." });
        }

        const response = await fetch(`${process.env.AI_SERVICE_URL}/insights`, {
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
        console.error('AI Service Error:', error);
        // Fallback to neutral data if AI service is down
        res.json({
            insight: "System is ready. Start logging tasks to see AI-powered suggestions.",
            productivity_score: 0
        });
    }
};

export const predictConsistency = async (req, res) => {
    try {
        if (!process.env.AI_SERVICE_URL) {
            return res.json({ prediction: 75 });
        }

        const response = await fetch(`${process.env.AI_SERVICE_URL}/predict`, {
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
