const fs = require('fs');
const path = require('path');

// ── PostgreSQL (production on Railway) ──────────────────────────────────────
let pool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('🐘 PostgreSQL persistence enabled');
} else {
  console.log('📁 File-system persistence enabled (local dev)');
}

// ── File-system fallback (local dev) ────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const fileLoad = (filename, defaultValue) => {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`📂 Loaded ${filename} (${Array.isArray(data) ? data.length : Object.keys(data).length} entries)`);
      return data;
    }
  } catch (err) {
    console.warn(`⚠️ Could not load ${filename}:`, err.message);
  }
  return defaultValue;
};

const fileSave = (filename, data) => {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`❌ Could not save ${filename}:`, err.message);
  }
};

// ── Public API ───────────────────────────────────────────────────────────────

const initialize = async () => {
  if (pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_data (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL
      )
    `);
    console.log('✅ PostgreSQL app_data table ready');
  }
};

const load = async (key, defaultValue) => {
  if (pool) {
    try {
      const result = await pool.query('SELECT value FROM app_data WHERE key = $1', [key]);
      if (result.rows.length > 0) {
        const data = result.rows[0].value;
        console.log(`📂 Loaded ${key} from PostgreSQL (${Array.isArray(data) ? data.length : Object.keys(data).length} entries)`);
        return data;
      }
    } catch (err) {
      console.warn(`⚠️ Could not load ${key} from PostgreSQL:`, err.message);
    }
    return defaultValue;
  } else {
    return fileLoad(key + '.json', defaultValue);
  }
};

const save = async (key, data) => {
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO app_data (key, value) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb`,
        [key, JSON.stringify(data)]
      );
    } catch (err) {
      console.error(`❌ Could not save ${key} to PostgreSQL:`, err.message);
    }
  } else {
    fileSave(key + '.json', data);
  }
};

module.exports = { initialize, load, save };
