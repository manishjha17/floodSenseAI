const { Pool } = require('pg');

//setting up the pg pool
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
};

//ssl checking for neon
if (process.env.NODE_ENV === 'production' || 
   (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('render.com') || process.env.DATABASE_URL.includes('amazonaws.com')))) {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

const pool = new Pool(poolConfig);

//syntax for pg '$1' style
function translateSql(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
}

//insert,update,delete
async function run(sql, params = []) {
    const translatedSql = translateSql(sql);
    try {
        const result = await pool.query(translatedSql, params);
        return { 
            id: result.rows[0] ? (result.rows[0].id || null) : null, 
            changes: result.rowCount 
        };
    } catch (err) {
        if (!err.message || (!err.message.includes('already exists') && !err.message.includes('duplicate column'))) {
            console.error('Error running SQL:', sql);
            console.error(err);
        }
        throw err;
    }
}

// fetch multiple rows
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

// fetch a single row
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
