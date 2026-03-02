import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
    connectionString: 'postgresql://ascend_db_q0h9_user:CdibvrFoWpfspNFQXWxc0oCKVr8aIbRe@dpg-d6dg67npm1nc739pphpg-a.singapore-postgres.render.com/ascend_db_q0h9',
    ssl: { rejectUnauthorized: false }
});

async function migrateHabits() {
    try {
        console.log("Creating habits table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS habits (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                difficulty VARCHAR(10) CHECK (difficulty IN ('easy', 'medium', 'hard')),
                goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Updating tasks table...");
        await pool.query(`
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'temporary';
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE;
            UPDATE tasks SET type = 'temporary' WHERE type IS NULL;
        `);

        console.log("Migration complete!");
        process.exit(0);
    } catch (err) {
        console.error("Error RUNNING migration:", err.message);
        process.exit(1);
    }
}

migrateHabits();
