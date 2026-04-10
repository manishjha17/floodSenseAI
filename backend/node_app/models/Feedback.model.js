const db = require('../config/Database.config');

class Feedback {
    static async create(feedbackData) {
        const { timestamp, imagePath, imageUrl, textReport, prediction, confidence, feedbackStatus, correctedLabel } = feedbackData;
        return await db.run(
            `INSERT INTO feedback (timestamp, image_path, image_url, text_report, prediction, confidence, feedback_status, corrected_label)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING id`,
            [timestamp, imagePath, imageUrl, textReport, prediction, confidence, feedbackStatus, correctedLabel]
        );
    }

    static async getAll() {
        return await db.all("SELECT * FROM feedback ORDER BY timestamp DESC");
    }

    static async getOldLabel(id) {
        return await db.get("SELECT corrected_label, timestamp FROM feedback WHERE id = ?", [id]);
    }

    static async updateLabelAndMarkExported(id, correctedLabel) {
        return await db.run("UPDATE feedback SET corrected_label = ?, is_exported = 1 WHERE id = ?", [correctedLabel, id]);
    }

    static async getImageUrl(id) {
        return await db.get("SELECT image_url, timestamp FROM feedback WHERE id = ?", [id]);
    }

    static async getIncorrectFeedbackForExport() {
        return await db.all("SELECT id, image_url, corrected_label FROM feedback WHERE feedback_status = 'Incorrect' AND corrected_label IS NOT NULL AND corrected_label != 'TBD'");
    }

    static async markAsExported(ids) {
        if (!ids || ids.length === 0) return;
        const placeholders = ids.map(() => '?').join(',');
        return await db.run(`UPDATE feedback SET is_exported = 1 WHERE id IN (${placeholders})`, ids);
    }

    static async getApproved() {
        return await db.all("SELECT * FROM feedback WHERE is_exported = 1 ORDER BY timestamp DESC");
    }
}

module.exports = Feedback;
