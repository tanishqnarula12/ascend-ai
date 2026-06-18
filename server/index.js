import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import pool from './config/db.js';

import authRoutes from './routes/auth.js';
import goalRoutes from './routes/goals.js';
import taskRoutes from './routes/tasks.js';
import aiRoutes from './routes/ai.js';
import quickTodoRoutes from './routes/quickTodos.js';
import seasonRoutes from './routes/season.js';
import streakRoutes from './routes/streak.js';
import pushRoutes from './routes/push.js';
import reminderRoutes from './routes/reminders.js';
import { runDueReminders } from './controllers/reminderController.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Test DB Connection
pool.connect()
    .then(() => console.log('Connected to PostgreSQL Database'))
    .catch(err => console.error('Database connection error', err.stack));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quick-todos', quickTodoRoutes);
app.use('/api/season', seasonRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/reminders', reminderRoutes);

app.get('/', (req, res) => {
    res.send('AscendAI Backend is Running!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Best-effort: catches due reminders whenever the server happens to be awake.
// The external cron pinger (POST /api/reminders/check) is the reliable path —
// this just delivers sooner when the server isn't asleep.
setInterval(() => {
    runDueReminders().catch(err => console.error('[Reminders] internal check failed:', err));
}, 60 * 1000);

export { pool };
