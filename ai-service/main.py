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
    # Real logic would use scikit-learn model loaded from file
    return {
        "success_probability": random.uniform(0.7, 0.99),
        "recommended_difficulty": "Medium"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
