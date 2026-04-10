const db = require('../config/Database.config');

class HelpRequest {
    static async create(data) {
        const { timestamp, address, reportText, urgency, username, lat, lng } = data;
        return await db.run(
            "INSERT INTO help_requests (timestamp, address, report_text, urgency, username, lat, lng, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending') RETURNING id",
            [timestamp, address, reportText, urgency, username || null, lat || null, lng || null]
        );
    }

    static async getAllWithUsers() {
        return await db.all(`
            SELECT hr.*, u.full_name, u.phone
            FROM help_requests hr
            LEFT JOIN users u ON hr.username = u.username
            ORDER BY
                CASE hr.status WHEN 'pending' THEN 0 ELSE 1 END,
                CASE hr.urgency
                    WHEN 'High' THEN 1
                    WHEN 'Medium' THEN 2
                    WHEN 'Low' THEN 3
                    ELSE 4
                END, hr.timestamp DESC
        `);
    }

    static async fulfill(id, rescuerUsername, timestamp) {
        return await db.run(
            "UPDATE help_requests SET status = 'fulfilled', fulfilled_by = ?, fulfilled_at = ? WHERE id = ?",
            [rescuerUsername, timestamp, id]
        );
    }

    static async delete(id) {
        return await db.run('DELETE FROM help_requests WHERE id = ?', [id]);
    }
}

module.exports = HelpRequest;
