import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const connectionString = 'postgresql://ascend_db_q0h9_user:CdibvrFoWpfspNFQXWxc0oCKVr8aIbRe@dpg-d6dg67npm1nc739pphpg-a.singapore-postgres.render.com/ascend_db_q0h9';

async function init() {
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        console.log("Starting DB Init...");
        const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
        const statements = schema.split(';').filter(s => s.trim().length > 0);

        for (let statement of statements) {
            console.log("Executing:", statement.trim().substring(0, 50) + "...");
            await pool.query(statement);
        }

        console.log("✅ DONE!");
    } catch (e) {
        console.error("❌ FAILED!");
        console.error("Error:", e.message);
        console.error("Detail:", e.detail);
    } finally {
        await pool.end();
    }
}

init();
