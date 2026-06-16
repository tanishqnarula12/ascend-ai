import { query } from '../config/db.js';
import { getCurrentSeason } from '../utils/season.js';

// Auto-create the season_baselines table on server start — no manual migration needed.
// One row per (user, season). The row's baseline_* counts are a snapshot of the
// user's lifetime totals at the moment the season started for them, so league
// progress is scored only on what they did *this season* and naturally resets
// to zero when a new 45-day season begins.
const ensureTable = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS season_baselines (
            id              SERIAL PRIMARY KEY,
            user_id         INTEGER NOT NULL,
            season_number   INTEGER NOT NULL,
            baseline_tasks  INTEGER NOT NULL DEFAULT 0,
            baseline_todos  INTEGER NOT NULL DEFAULT 0,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, season_number)
        )
    `);
};
ensureTable().catch(err => console.error('[Season] Table init failed:', err));

const getLifetimeTotals = async (userId) => {
    const [tasksRes, todosRes] = await Promise.all([
        query('SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND is_completed = true', [userId]),
        query('SELECT COUNT(*) FROM quick_todos WHERE user_id = $1 AND done = true', [userId]),
    ]);
    return {
        lifetimeTasks: parseInt(tasksRes.rows[0].count, 10),
        lifetimeTodos: parseInt(todosRes.rows[0].count, 10),
    };
};

export const getSeasonProgress = async (req, res) => {
    try {
        const season = getCurrentSeason();
        const userId = req.user.id;
        const { lifetimeTasks, lifetimeTodos } = await getLifetimeTotals(userId);

        let baselineRes = await query(
            'SELECT baseline_tasks, baseline_todos FROM season_baselines WHERE user_id = $1 AND season_number = $2',
            [userId, season.number]
        );

        if (baselineRes.rows.length === 0) {
            baselineRes = await query(
                `INSERT INTO season_baselines (user_id, season_number, baseline_tasks, baseline_todos)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, season_number) DO UPDATE SET baseline_tasks = season_baselines.baseline_tasks
                 RETURNING baseline_tasks, baseline_todos`,
                [userId, season.number, lifetimeTasks, lifetimeTodos]
            );
        }

        const baseline = baselineRes.rows[0];

        res.json({
            season,
            seasonTasksCompleted: Math.max(0, lifetimeTasks - baseline.baseline_tasks),
            seasonTodosCompleted: Math.max(0, lifetimeTodos - baseline.baseline_todos),
        });
    } catch (error) {
        console.error('[Season] getSeasonProgress:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
