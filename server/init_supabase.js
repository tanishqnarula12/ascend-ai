import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
const pool = new Pool({
    connectionString: 'postgresql://postgres.cjhiwhgmphkrnraiptsy:term2boardno@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    try {
        console.log("Connecting to Supabase Database to initialize schema...");
        const schemaPath = path.resolve('database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);

        console.log("Supabase schema initialized!");
        process.exit(0);
    } catch (err) {
        console.error("Failed to initialize schema:", err.message);
        process.exit(1);
    }
}

initDB();
