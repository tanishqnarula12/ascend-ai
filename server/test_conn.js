import pg from 'pg';
const { Pool } = pg;

const connectionString = 'postgresql://ascend_db_q0h9_user:CdibvrFoWpfspNFQXWxc0oCKVr8aIbRe@dpg-d6dg67npm1nc739pphpg-a.singapore-postgres.render.com/ascend_db_q0h9';

async function test() {
    console.log("Testing with SSL: false");
    const pool1 = new Pool({ connectionString, ssl: false });
    try {
        const res = await pool1.query('SELECT NOW()');
        console.log("Success with SSL: false", res.rows[0]);
    } catch (e) {
        console.log("Failed with SSL: false", e.message);
    } finally {
        await pool1.end();
    }

    console.log("Testing with SSL: { rejectUnauthorized: false }");
    const pool2 = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        const res = await pool2.query('SELECT NOW()');
        console.log("Success with SSL: { rejectUnauthorized: false }", res.rows[0]);
    } catch (e) {
        console.log("Failed with SSL: { rejectUnauthorized: false }", e.message);
    } finally {
        await pool2.end();
    }
}

test();
