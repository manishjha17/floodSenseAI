const { Pool } = require('pg');

// Initialize PostgreSQL Pool Configuration
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
};

// Cloud databases (e.g., Neon, Render, Heroku) strictly require SSL
if (process.env.NODE_ENV === 'production' || 
   (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('render.com') || process.env.DATABASE_URL.includes('amazonaws.com')))) {
    poolConfig.ssl = {
        rejectUnauthorized: false // Required for some managed databases to allow self-signed certs
    };
}

const pool = new Pool(poolConfig);

// Helper to translate '?' (SQLite style) to '$1, $2...' (PostgreSQL style)
function translateSql(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
}

/**
 * Helper to run a command (INSERT, UPDATE, DELETE)
 * For INSERTs, use RETURNING id in your SQL to get the ID back.
 */
async function run(sql, params = []) {
    const translatedSql = translateSql(sql);
    try {
        const result = await pool.query(translatedSql, params);
        
        // Match sqlite3 response structure
        return { 
            id: result.rows[0] ? (result.rows[0].id || null) : null, 
            changes: result.rowCount 
        };
    } catch (err) {
        // Suppress duplicate column errors during migrations
        if (!err.message || (!err.message.includes('already exists') && !err.message.includes('duplicate column'))) {
            console.error('Error running SQL:', sql);
            console.error(err);
        }
        throw err;
    }
}

/**
 * Helper to get all results (SELECT)
 */
async function all(sql, params = []) {
    const translatedSql = translateSql(sql);
    try {
        const result = await pool.query(translatedSql, params);
        return result.rows;
    } catch (err) {
        console.error('Error running SQL:', sql);
        console.error(err);
        throw err;
    }
}

/**
 * Helper to get one result (SELECT)
 */
async function get(sql, params = []) {
    const translatedSql = translateSql(sql);
    try {
        const result = await pool.query(translatedSql, params);
        return result.rows[0];
    } catch (err) {
        console.error('Error running SQL:', sql);
        console.error(err);
        throw err;
    }
}

module.exports = { pool, run, all, get };
