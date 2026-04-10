const db = require('../config/Database.config');

class User {
    static async findByUsername(username) {
        return await db.get("SELECT * FROM users WHERE username = ?", [username]);
    }

    static async findByEmail(email) {
        return await db.get("SELECT * FROM users WHERE email = ?", [email]);
    }

    static async findByPhone(phone) {
        return await db.get("SELECT * FROM users WHERE phone = ?", [phone]);
    }

    static async create(userData) {
        const { username, passwordHash, role, fullName, email, phone, organization, badgeNumber, address, idProofUrl, status, securityQuestion, securityAnswer } = userData;

        const query = `
             INSERT INTO users 
            (username, password_hash, role, full_name, email, phone, organization, badge_number, address, id_proof_url, status, security_question, security_answer) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        `;
        const params = [
            username, passwordHash, role, fullName, email, phone,
            organization, badgeNumber, address, idProofUrl, status, securityQuestion, securityAnswer
        ];

        return await db.run(query, params);
    }

    static async getPendingRescuers() {
        return await db.all("SELECT id, username, full_name, email, phone, organization, badge_number, id_proof_url FROM users WHERE role = 'rescuer' AND status = 'pending'");
    }

    static async approveRescuer(userId) {
        return await db.run("UPDATE users SET status = 'active' WHERE id = ?", [userId]);
    }

    static async rejectRescuer(userId) {
        return await db.run("DELETE FROM users WHERE id = ?", [userId]);
    }

    static async getSecurityQuestion(username) {
        return await db.get("SELECT security_question FROM users WHERE username = ?", [username]);
    }

    static async getSecurityAnswer(username) {
        return await db.get("SELECT id, security_answer FROM users WHERE username = ?", [username]);
    }

    static async updatePassword(userId, newPasswordHash) {
        return await db.run("UPDATE users SET password_hash = ? WHERE id = ?", [newPasswordHash, userId]);
    }

    static async getProfile(username) {
        return await db.get(
            `SELECT id, username, role, full_name, email, phone, organization, badge_number, address, status, id_proof_url 
             FROM users WHERE username = ?`,
            [username]
        );
    }
}

module.exports = User;
