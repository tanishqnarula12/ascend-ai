import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
    connectionString: 'postgresql://ascend_db_q0h9_user:CdibvrFoWpfspNFQXWxc0oCKVr8aIbRe@dpg-d6dg67npm1nc739pphpg-a.singapore-postgres.render.com/ascend_db_q0h9',
    ssl: { rejectUnauthorized: false }
});

async function migrateHabitMatrixToReports() {
    try {
        console.log("Updating weekly_reports table...");
        await pool.query(`
            ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS habit_matrix JSONB;
        `);

        console.log("Migration complete!");
        process.exit(0);
    } catch (err) {
        console.error("Error RUNNING migration:", err.message);
        process.exit(1);
    }
}

migrateHabitMatrixToReports();
