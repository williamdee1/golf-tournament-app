/**
 * One-time migration script: pushes local JSON data into Railway PostgreSQL.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node migrate.js
 *
 * Or on Windows:
 *   set DATABASE_URL=postgresql://... && node migrate.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('   Usage: DATABASE_URL="postgresql://..." node migrate.js');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, 'data');

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_data (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL
      )
    `);
    console.log('✅ Table ready');

    // Migrate each JSON file
    const files = [
      { file: 'users.json', key: 'users' },
      { file: 'tournaments.json', key: 'tournaments' },
    ];

    for (const { file, key } of files) {
      const filePath = path.join(DATA_DIR, file);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${file} not found, skipping`);
        continue;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      await pool.query(
        `INSERT INTO app_data (key, value) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb`,
        [key, JSON.stringify(data)]
      );
      console.log(`✅ Migrated ${key}: ${Array.isArray(data) ? data.length : Object.keys(data).length} entries`);
    }

    console.log('\n🎉 Migration complete! Your data is now in Railway PostgreSQL.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
