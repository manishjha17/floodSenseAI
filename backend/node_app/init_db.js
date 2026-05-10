const db = require('./config/Database.config');
const { hashPassword } = require('./utils/Hash.util');

async function initDb() {
    try {
        // --- Feedback Table ---
        // Using SERIAL for auto-incrementing IDs in PostgreSQL
        // image_url replaces image_data (storing Cloudinary URLs)
        await db.run(`CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            image_path TEXT, 
            image_url TEXT,
            text_report TEXT,
            prediction TEXT,
            confidence DOUBLE PRECISION,
            feedback_status TEXT,
            corrected_label TEXT,
            is_exported SMALLINT DEFAULT 0
        )`);

        // Migrations helper: Check if is_exported exists (standard for init_db logic)
        try { await db.run(`ALTER TABLE feedback ADD COLUMN is_exported SMALLINT DEFAULT 0`); } catch (e) {}
        try { await db.run(`ALTER TABLE feedback ADD COLUMN image_url TEXT`); } catch (e) {}

        // --- Users Table ---
        await db.run(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'citizen',
            full_name TEXT,
            email TEXT,
            phone TEXT,
            organization TEXT,
            badge_number TEXT,
            address TEXT,
            id_proof_url TEXT,
            status TEXT DEFAULT 'active',
            security_question TEXT,
            security_answer TEXT,
            reset_otp TEXT,
            reset_otp_expiry TIMESTAMP
        )`);

        try { await db.run(`ALTER TABLE users ADD COLUMN id_proof_url TEXT`); } catch (e) {}


        // Ensure all migration columns exist for Users
        const userCols = [
            "full_name TEXT",
            "email TEXT",
            "phone TEXT",
            "organization TEXT",
            "badge_number TEXT",
            "address TEXT",
            "id_proof_url TEXT",
            "status TEXT DEFAULT 'active'",
            "security_question TEXT",
            "security_answer TEXT",
            "reset_otp TEXT",
            "reset_otp_expiry TIMESTAMP"
        ];

        for (const col of userCols) {
            try {
                await db.run(`ALTER TABLE users ADD COLUMN ${col}`);
            } catch (e) {}
        }

        // --- Help Requests Table ---
        await db.run(`CREATE TABLE IF NOT EXISTS help_requests (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            address TEXT,
            report_text TEXT,
            urgency TEXT,
            username TEXT,
            lat DOUBLE PRECISION,
            lng DOUBLE PRECISION,
            status TEXT DEFAULT 'pending',
            fulfilled_by TEXT,
            fulfilled_at TIMESTAMP
        )`);

        // Ensure all migration columns exist for Help Requests
        const helpCols = [
            "username TEXT",
            "lat DOUBLE PRECISION",
            "lng DOUBLE PRECISION",
            "status TEXT DEFAULT 'pending'",
            "fulfilled_by TEXT",
            "fulfilled_at TIMESTAMP"
        ];

        for (const col of helpCols) {
            try {
                await db.run(`ALTER TABLE help_requests ADD COLUMN ${col}`);
            } catch (e) {}
        }

        // --- Default Admin ---
        const admin = await db.get("SELECT * FROM users WHERE username = $1", ['admin']);
        if (!admin) {
            try {
                const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
                // Note: The '?' translation layer handles '?' but here we can just use Postgres style directly or '?'
                await db.run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                    ['admin', await hashPassword(defaultPassword), 'admin']);
                console.log("Created default admin user.");
            } catch (e) {}
        }

        console.log("PostgreSQL Database initialized successfully.");
    } catch (err) {
        console.error("DB Init Error:", err);
    }
}

module.exports = initDb;
