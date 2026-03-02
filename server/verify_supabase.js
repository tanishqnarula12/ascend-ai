import pool from './config/db.js';

async function verify() {
    try {
        const users = await pool.query('SELECT COUNT(*) FROM users');
        const tasks = await pool.query('SELECT COUNT(*) FROM tasks');
        const goals = await pool.query('SELECT COUNT(*) FROM goals');

        console.log("USERS:", users.rows[0].count);
        console.log("TASKS:", tasks.rows[0].count);
        console.log("GOALS:", goals.rows[0].count);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
verify();
