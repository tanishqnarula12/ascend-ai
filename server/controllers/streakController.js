import { query } from '../config/db.js';
import { getCurrentSeason } from '../utils/season.js';

// A revival can only bridge a gap of up to this many missing days.
const MAX_GAP_DAYS = 3;

const ensureTables = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS streak_revival_days (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            revival_date DATE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, revival_date)
        )
    `);
    await query(`
        CREATE TABLE IF NOT EXISTS streak_revival_log (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            season_number INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, season_number)
        )
    `);
};
ensureTables().catch(err => console.error('[Streak] Table init failed:', err));

// Same source the live streak query reads from (tasks + previously revived days),
// so the "gap since last activity" check here always agrees with the streak shown on screen.
const getMostRecentCompletionDate = async (userId) => {
    const res = await query(
        `SELECT MAX(date) as date FROM (
            SELECT DATE(completed_at) as date FROM tasks WHERE user_id = $1 AND is_completed = true
            UNION
            SELECT revival_date as date FROM streak_revival_days WHERE user_id = $1
        ) d
        WHERE date <= CURRENT_DATE`,
        [userId]
    );
    return res.rows[0]?.date || null;
};

const daysAgo = (date) => {
    const d = new Date(date);
    const today = new Date();
    const utcDate = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    return Math.round((utcToday - utcDate) / 86400000);
};

export const getStreakStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const season = getCurrentSeason();

        const usedRes = await query(
            'SELECT 1 FROM streak_revival_log WHERE user_id = $1 AND season_number = $2',
            [userId, season.number]
        );
        const usedThisSeason = usedRes.rows.length > 0;
        const remaining = usedThisSeason ? 0 : 1;

        const lastDate = await getMostRecentCompletionDate(userId);
        if (!lastDate) {
            return res.json({ revivable: false, gapDays: 0, usedThisSeason, remaining });
        }

        const gapDays = daysAgo(lastDate) - 1; // missing days between last activity and today
        const revivable = !usedThisSeason && gapDays >= 1 && gapDays <= MAX_GAP_DAYS;

        res.json({ revivable, gapDays, usedThisSeason, remaining });
    } catch (error) {
        console.error('[Streak] getStreakStatus:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const reviveStreak = async (req, res) => {
    try {
        const userId = req.user.id;
        const season = getCurrentSeason();

        const lastDate = await getMostRecentCompletionDate(userId);
        if (!lastDate) {
            return res.status(400).json({ message: 'No streak to revive' });
        }

        const gapDays = daysAgo(lastDate) - 1;
        if (gapDays < 1 || gapDays > MAX_GAP_DAYS) {
            return res.status(400).json({ message: 'Streak is not in a revivable state' });
        }

        // Claim this season's revival slot first — the UNIQUE constraint blocks a second use.
        try {
            await query(
                'INSERT INTO streak_revival_log (user_id, season_number) VALUES ($1, $2)',
                [userId, season.number]
            );
        } catch (err) {
            if (err.code === '23505') {
                return res.status(400).json({ message: 'Already used your revival this season' });
            }
            throw err;
        }

        // Backfill the missing calendar dates so the existing streak query bridges the gap.
        for (let i = 1; i <= gapDays; i++) {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            await query(
                'INSERT INTO streak_revival_days (user_id, revival_date) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [userId, dateStr]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[Streak] reviveStreak:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
