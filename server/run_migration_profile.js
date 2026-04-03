import { query } from './config/db.js';

const runMigration = async () => {
    try {
        console.log('Starting profile migration...');
        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS photo_url TEXT;
        `);
        console.log('Successfully added photo_url to users table.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
};

runMigration();
