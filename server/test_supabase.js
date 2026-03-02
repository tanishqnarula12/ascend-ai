import pg from 'pg';

const { Pool } = pg;
const pool1 = new Pool({
    connectionString: 'postgresql://postgres.cjhiwhgmphkrnraiptsy:term2boardno@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function testConn() {
    try {
        console.log("Testing Supabase Pooler...");
        const res = await pool1.query('SELECT NOW()');
        console.log("Success:", res.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error("Failed:", err.message);
        process.exit(1);
    }
}

testConn();
