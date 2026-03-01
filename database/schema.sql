-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Goals Table
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- e.g., Career, Health, Personal
    goal_type VARCHAR(20) CHECK (goal_type IN ('short-term', 'long-term')),
    deadline DATE,
    status VARCHAR(20) DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'abandoned')),
    progress INTEGER DEFAULT 0, -- percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table (Daily actionable items linked to goals)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    difficulty VARCHAR(10) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    is_completed BOOLEAN DEFAULT FALSE,
    due_date DATE DEFAULT CURRENT_DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Daily Logs (For journaling and scoring)
CREATE TABLE IF NOT EXISTS daily_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE DEFAULT CURRENT_DATE,
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
    journal_entry TEXT,
    tasks_completed_count INTEGER DEFAULT 0,
    daily_score INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, log_date)
);

-- AI Insights Table
CREATE TABLE IF NOT EXISTS ai_insights (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50), -- e.g., 'productivity_pattern', 'motivation', 'risk_warning'
    content TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Focus Sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    distractions_count INTEGER DEFAULT 0,
    linked_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Consistency Scores
CREATE TABLE IF NOT EXISTS consistency_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    trend VARCHAR(10), -- 'up', 'down', 'stable'
    captured_at DATE DEFAULT CURRENT_DATE,
    UNIQUE(user_id, captured_at)
);

-- Weekly Reports
CREATE TABLE IF NOT EXISTS weekly_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    completion_rate DECIMAL,
    strongest_goal VARCHAR(255),
    weakest_goal VARCHAR(255),
    burnout_risk VARCHAR(20),
    ai_summary TEXT,
    focus_hours DECIMAL,
    total_tasks_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, log_date);
