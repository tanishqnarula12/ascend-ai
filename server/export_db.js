import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;
const pool = new Pool({
    connectionString: 'postgresql://ascend_db_q0h9_user:CdibvrFoWpfspNFQXWxc0oCKVr8aIbRe@dpg-d6dg67npm1nc739pphpg-a.singapore-postgres.render.com/ascend_db_q0h9',
    ssl: { rejectUnauthorized: false }
});

async function exportData() {
    try {
        console.log("Connecting to Render Database...");
        const tables = ['users', 'goals', 'habits', 'tasks', 'focus_sessions', 'daily_logs', 'weekly_reports', 'consistency_scores'];
        const exportData = {};

        for (const table of tables) {
            console.log(`Exporting ${table}...`);
            const res = await pool.query(`SELECT * FROM ${table}`);
            exportData[table] = res.rows;
        }

        fs.writeFileSync('render_backup.json', JSON.stringify(exportData, null, 2));
        console.log("Data successfully exported to render_backup.json");
        process.exit(0);
    } catch (err) {
        console.error("Export failed:", err.message);
        process.exit(1);
    }
}

exportData();
