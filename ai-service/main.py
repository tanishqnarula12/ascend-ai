from fastapi import FastAPI
from pydantic import BaseModel
import random

app = FastAPI()

class UserRequest(BaseModel):
    user_id: int

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

@app.post("/burnout")
def detect_burnout(data: dict):
    hard_ratio = data.get('hard_task_ratio', 0)
    declining_momentum = data.get('momentum', 0) < 40
    streak_broken = data.get('streak_broken', False)
    
    risk = "LOW"
    if hard_ratio > 60 and declining_momentum:
        risk = "HIGH"
    elif hard_ratio > 40 or declining_momentum or streak_broken:
        risk = "MODERATE"
        
    return {"risk_level": risk}

@app.post("/weekly-report")
def generate_weekly_report(data: dict):
    user_name = data.get('username', 'User')
    comp_rate = data.get('completion_rate', 0)
    
    return {
        "ai_summary": f"Great work this week, {user_name}! You completed {comp_rate}% of your tasks. Your focus was primarily on Career goals. Avoid loading too many 'Hard' tasks on Mondays to maintain momentum.",
        "burnout_risk": "LOW" if comp_rate > 70 else "MODERATE",
        "focus_hours": round(random.uniform(10, 25), 1)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
