import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;
const pool = new Pool({
    connectionString: 'postgresql://postgres.cjhiwhgmphkrnraiptsy:term2boardno@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

const escapeValue = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number' || typeof val === 'boolean') return val;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    // Escape single quotes for SQL
    return `'${String(val).replace(/'/g, "''")}'`;
};

async function importData() {
    try {
        console.log("Reading render_backup.json...");
        const rawData = fs.readFileSync('render_backup.json', 'utf8');
        const data = JSON.parse(rawData);

        // Explicit ordered array of tables to maintain foreign key integrity
        const tables = ['users', 'goals', 'habits', 'tasks', 'focus_sessions', 'daily_logs', 'weekly_reports', 'consistency_scores'];

        for (const table of tables) {
            const rows = data[table] || [];
            if (rows.length === 0) continue;

            console.log(`Importing ${rows.length} rows into ${table}...`);
            const columns = Object.keys(rows[0]);

            for (const row of rows) {
                const values = columns.map(c => escapeValue(row[c]));
                const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`;
                await pool.query(query);
            }

            // Adjust sequence after inserts
            if (columns.includes('id')) {
                await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table};`);
            }
        }

        console.log("All data successfully imported to Supabase!");
        process.exit(0);
    } catch (err) {
        console.error("Import failed:", err.message);
        process.exit(1);
    }
}

importData();
