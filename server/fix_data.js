import pool from './config/db.js';

async function fixData() {
    try {
        console.log("Fixing tasks with missing completed_at...");
        await pool.query("UPDATE tasks SET completed_at = created_at WHERE is_completed = true AND completed_at IS NULL");

        console.log("Recalculating all goal progress...");
        const goals = await pool.query("SELECT id, user_id FROM goals");

        for (const goal of goals.rows) {
            const tasksRes = await pool.query("SELECT is_completed FROM tasks WHERE goal_id = $1", [goal.id]);
            if (tasksRes.rows.length === 0) {
                await pool.query("UPDATE goals SET progress = 0 WHERE id = $1", [goal.id]);
                continue;
            }
            const completed = tasksRes.rows.filter(t => t.is_completed).length;
            const total = tasksRes.rows.length;
            const progress = Math.round((completed / total) * 100);
            await pool.query("UPDATE goals SET progress = $1 WHERE id = $2", [progress, goal.id]);
            console.log(`Updated goal ${goal.id} to ${progress}%`);
        }

        console.log("✅ Data fix complete!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Data fix failed:");
        console.error(err);
        process.exit(1);
    }
}

fixData();
