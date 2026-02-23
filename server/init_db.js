import pool from './config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initDatabase() {
    try {
        console.log("Reading schema.sql...");
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log("Connecting to database and running schema...");
        await pool.query(schema);

        console.log("✅ Database initialized successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error initializing database:");
        console.error("Message:", err.message);
        console.error("Detail:", err.detail);
        console.error("Stack:", err.stack);
        process.exit(1);
    }
}

initDatabase();
