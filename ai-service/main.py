from fastapi import FastAPI
from pydantic import BaseModel
import random

app = FastAPI()

class UserRequest(BaseModel):
    user_id: int | str

@app.get("/")
def read_root():
    return {"message": "AscendAI AI Service Operational"}

@app.post("/insights")
def generate_insights(request: UserRequest):
    # In a real app, successful fetching of user logs from DB would happen here
    # Mocking analysis based on user_id
    strategies = [
        "Your peak productivity is observed between 10 AM and 2 PM.",
        "Your task completion rate drops on weekends. Consider lighter goals for leisure.",
        "You've maintained a 3-day streak! Consistency is the key to mastery.",
        "Based on your patterns, you are at risk of burnout. Schedule a break."
    ]
    return {
        "insight": random.choice(strategies),
        "productivity_score": random.randint(65, 98),
        "mood_trend": "Improving"
    }

@app.post("/predict")
def predict_success(data: dict):
    # Mock prediction model logic
    return {
        "success_probability": random.uniform(0.7, 0.99),
        "recommended_difficulty": "Medium"
    }

@app.post("/briefing")
def get_daily_briefing(request: UserRequest):
    templates = [
        "Today is a high-energy day. Focus on your 'Hard' tasks before 2 PM.",
        "You have a 3-day streak going! Data suggests you're most productive when finishing small tasks first today.",
        "Your goal 'Aesthetic Physique' is 80% complete. One final push on training today will trigger a milestone!",
        "Warning: Wednesday is usually your lowest productivity day. Plan ahead to break the pattern."
    ]
    return {
        "briefing": random.choice(templates),
        "focus_priority": "Deep Work",
        "estimated_completion": "6:00 PM"
    }

@app.post("/consistency")
def calculate_consistency(data: dict):
    # data includes last 30 days tasks, streak, etc.
    # Formula: (CompRate * 0.4) + (StreakScore * 0.2) + (DiffBalance * 0.2) + (MomentumTrend * 0.2)
    comp_rate = data.get('completion_rate', 0)
    streak = data.get('streak', 0)
    hard_ratio = data.get('hard_task_ratio', 0)
    momentum = data.get('momentum', 0)
    
    streak_score = min(streak * 5, 100) # Max 100 at 20 days
    diff_balance = 100 - abs(hard_ratio - 33) * 2 # Ideally 33% hard tasks
    
    score = (comp_rate * 0.4) + (streak_score * 0.2) + (diff_balance * 0.2) + (momentum * 0.2)
    
    return {
        "score": round(score),
        "trend": "up" if momentum > 50 else "down"
    }

def _clamp01(n):
    return max(0.0, min(1.0, n))

FACTOR_LABELS = {
    "workload": "a heavy task volume",
    "difficulty": "too many hard tasks stacked together",
    "incompletion": "committing to more than you actually finish",
    "momentum": "a sharp drop in your completion rate",
}

FACTOR_TIPS = {
    "workload": "Trim the list — pick the 3 tasks that truly move the needle today.",
    "difficulty": "Slot some easy wins between the hard tasks so you can recover.",
    "incompletion": "Commit to fewer tasks and actually close them out — quality over quantity.",
    "momentum": "Lower the bar for a day or two to rebuild your streak gently.",
}


def compute_burnout(tasks_this_week, completion_rate, hard_ratio, prev_completion_rate=None):
    """Weighted multi-factor burnout model (mirrors the Node analytics service).

    Blends independent stress signals into one continuous 0-100 score so the
    result reflects the real workload instead of almost always returning LOW.
    """
    if tasks_this_week == 0:
        return {
            "risk_level": "N/A (Inactive)",
            "score": 0,
            "factors": {},
            "primary_driver": None,
            "recommendation": "Log a few tasks so we can read your workload.",
        }

    # Factor 1: workload volume (~10/week healthy, 35+ overload)
    workload = _clamp01((tasks_this_week - 10) / 25) * 100
    # Factor 2: difficulty strain (too many hard tasks in a row)
    difficulty = _clamp01((hard_ratio - 20) / 60) * 100
    # Factor 3: incompletion pressure, scaled by how much was taken on
    incompletion = _clamp01((100 - completion_rate) / 100) * 100 * _clamp01(tasks_this_week / 6)
    # Factor 4: momentum drop vs last week (only if we have prior data)
    if prev_completion_rate is not None:
        momentum = _clamp01((prev_completion_rate - completion_rate) / 40) * 100
        weights = {"workload": 0.22, "difficulty": 0.24, "incompletion": 0.30, "momentum": 0.24}
    else:
        momentum = 0
        weights = {"workload": 0.30, "difficulty": 0.30, "incompletion": 0.40, "momentum": 0.0}

    factors = {
        "workload": round(workload),
        "difficulty": round(difficulty),
        "incompletion": round(incompletion),
        "momentum": round(momentum),
    }

    score = round(
        workload * weights["workload"]
        + difficulty * weights["difficulty"]
        + incompletion * weights["incompletion"]
        + momentum * weights["momentum"]
    )

    if score >= 80:
        risk = "SEVERE"
    elif score >= 60:
        risk = "HIGH"
    elif score >= 35:
        risk = "MODERATE"
    else:
        risk = "LOW"

    primary_driver = None
    recommendation = "You're well balanced right now — keep your current rhythm."
    top_key = max(factors, key=factors.get)
    if factors[top_key] > 0 and score >= 35:
        primary_driver = top_key
        recommendation = f"Main driver: {FACTOR_LABELS[top_key]}. {FACTOR_TIPS[top_key]}"

    return {
        "risk_level": risk,
        "score": score,
        "factors": factors,
        "primary_driver": primary_driver,
        "recommendation": recommendation,
    }


@app.post("/burnout")
def detect_burnout(data: dict):
    return compute_burnout(
        tasks_this_week=data.get('tasks_this_week', 0),
        completion_rate=data.get('completion_rate', 0),
        hard_ratio=data.get('hard_task_ratio', 0),
        prev_completion_rate=data.get('prev_completion_rate'),
    )

@app.post("/motivation")
def get_daily_motivation(request: UserRequest):
    quotes = [
        "The only way to do great work is to love what you do. – Steve Jobs",
        "Don't count the days, make the days count. – Muhammad Ali",
        "The secret of getting ahead is getting started. – Mark Twain",
        "Your only limit is your mind.",
        "A year from now you may wish you had started today.",
        "Discipline is doing what needs to be done, even if you don't want to do it.",
        "Small steps every day lead to big results.",
        "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
        "It does not matter how slowly you go as long as you do not stop. – Confucius",
        "Believe you can and you're halfway there. – Theodore Roosevelt",
        "You are never too old to set another goal or to dream a new dream. – C.S. Lewis",
        "What you get by achieving your goals is not as important as what you become by achieving your goals. – Zig Ziglar",
        "I find that the harder I work, the more luck I seem to have. – Thomas Jefferson",
        "The future depends on what you do today. – Mahatma Gandhi",
        "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
        "Everything you've ever wanted is on the other side of fear. – George Addair"
    ]
    return {
        "quote": random.choice(quotes),
        "author": "AscendAI Wisdom"
    }

@app.post("/weekly-report")
def generate_weekly_report(data: dict):
    user_name = data.get('username', 'User')
    comp_rate = data.get('completion_rate', 0)
    total_tasks = data.get('total_tasks_completed', 0)
    tasks_this_week = data.get('tasks_this_week', 1)
    
    if tasks_this_week == 0:
        return {
            "ai_summary": f"Hi {user_name}, we missed you this week! You haven't logged any tasks recently. Take your time, and jump back in when you're ready.",
            "burnout_risk": "N/A (Inactive)"
        }
    
    # Advanced burnout calculation matching the live dashboard model
    hard_ratio = data.get('hard_task_ratio', 0)
    burnout = compute_burnout(
        tasks_this_week=tasks_this_week,
        completion_rate=comp_rate,
        hard_ratio=hard_ratio,
        prev_completion_rate=data.get('prev_completion_rate'),
    )

    lifetime_msg = f" You've completed {total_tasks} tasks overall!" if total_tasks > 0 else ""
    coaching = f" {burnout['recommendation']}" if burnout.get('recommendation') else ""

    return {
        "ai_summary": f"Great work this week, {user_name}! You completed {comp_rate}% of your tasks.{lifetime_msg}{coaching}",
        "burnout_risk": burnout["risk_level"],
        "burnout_score": burnout["score"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
