import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
const pool = new Pool({
    connectionString: 'postgresql://ascend_db_q0h9_user:CdibvrFoWpfspNFQXWxc0oCKVr8aIbRe@dpg-d6dg67npm1nc739pphpg-a.singapore-postgres.render.com/ascend_db_q0h9',
    ssl: { rejectUnauthorized: false }
});

async function fixDB() {
    try {
        console.log("Running schema.sql...");
        const sql = fs.readFileSync(path.join(process.cwd(), 'database', 'schema.sql'), 'utf8');
        await pool.query(sql);
        console.log("Migration complete!");
        process.exit(0);
    } catch (err) {
        console.error("Error RUNNING migration:", err.message);
        process.exit(1);
    }
}

fixDB();

