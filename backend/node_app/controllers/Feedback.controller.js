const Feedback = require('../models/Feedback.model');
const cloudinary = require('../config/Cloudinary.config');
const archiver = require('archiver');
const axios = require('axios');

function getCurrentTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

exports.submitFeedback = async (req, res) => {
    try {
        const { image_path = "N/A", image_data, text_report = "", prediction, confidence, feedback_status, corrected_label } = req.body;

        let imageUrl = null;
        if (image_data && image_data.startsWith('data:image')) {
            const uploadResponse = await cloudinary.uploader.upload(image_data, {
                folder: 'flood_feedback',
            });
            imageUrl = uploadResponse.secure_url;
            console.log("Uploaded image to Cloudinary:", imageUrl);
        }

        let parsedConfidence = null;
        if (confidence !== undefined && confidence !== null) {
            const confString = String(confidence).replace('%', '').trim();
            parsedConfidence = parseFloat(confString);
            if (isNaN(parsedConfidence)) parsedConfidence = null;
        }

        await Feedback.create({
            timestamp: getCurrentTimestamp(),
            imagePath: image_path,
            imageUrl: imageUrl, 
            textReport: text_report,
            prediction,
            confidence: parsedConfidence,
            feedbackStatus: feedback_status,
            correctedLabel: corrected_label
        });

        res.json({ message: "Feedback submitted successfully" });
    } catch (err) {
        console.error("=== Feedback submission error ===");
        console.error("Message:", err.message);
        console.error("Stack:", err.stack);
        res.status(500).json({ detail: err.message });
    }
};

exports.getAllFeedback = async (req, res) => {
    try {
        res.json(await Feedback.getAll());
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: err.message });
    }
};

exports.updateLabel = async (req, res) => {
    try {
        const { id, corrected_label } = req.body;
        if (!id || !corrected_label) return res.status(400).json({ detail: "id and corrected_label required" });
        await Feedback.updateLabelAndMarkExported(id, corrected_label);

        res.json({ message: "Label updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: err.message });
    }
};

exports.exportCorrectedImages = async (req, res) => {
    try {
        const rows = await Feedback.getIncorrectFeedbackForExport();

        if (!rows || rows.length === 0) return res.status(404).json({ detail: "No corrected images found" });

        const archive = archiver('zip', { zlib: { level: 9 } });

        res.attachment(`corrected_images_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`);
        archive.pipe(res);

        const exportedIds = [];

        for (const row of rows) {
            const { id, image_url, corrected_label } = row;
            if (image_url) {
                try {
                    const imageResponse = await axios.get(image_url, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(imageResponse.data, 'binary');
                    const labelFolder = corrected_label.toLowerCase().replace(/ /g, '_');
                    archive.append(buffer, { name: `${labelFolder}/image_${id}.jpg` });
                    exportedIds.push(id);
                } catch (fetchErr) {
                    console.error(`Failed to fetch image ${id} from ${image_url}`, fetchErr);
                }
            }
        }

        await archive.finalize();

        await Feedback.markAsExported(exportedIds);

    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: err.message });
    }
};

exports.getApprovedTrainingData = async (req, res) => {
    try {
        res.json(await Feedback.getApproved());
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: err.message });
    }
};
