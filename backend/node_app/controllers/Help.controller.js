const HelpRequest = require('../models/HelpRequest.model');
function getCurrentTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

exports.submitRequest = async (req, res) => {
    try {
        const { address, report_text, username, lat, lng, urgency = 'High' } = req.body;
        if ((!address && (!lat || !lng)) || !report_text) {
            return res.status(400).json({ detail: "Address or GPS location, and report_text are required" });
        }
        
        await HelpRequest.create({
            timestamp: getCurrentTimestamp(),
            address,
            reportText: report_text,
            urgency,
            username,
            lat,
            lng
        });

        res.json({ message: "Help request submitted successfully", urgency });
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: err.message });
    }
};

exports.getRequests = async (req, res) => {
    try {
        res.json(await HelpRequest.getAllWithUsers());
    } catch (err) {
        console.error("Failed to fetch requests", err);
        res.status(500).json({ detail: "Server error" });
    }
};

exports.fulfillRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { rescuer_username } = req.body;
        if (!rescuer_username) return res.status(400).json({ detail: 'rescuer_username is required' });

        await HelpRequest.fulfill(id, rescuer_username, getCurrentTimestamp());
        res.json({ message: 'Request marked as fulfilled' });
    } catch (err) {
        console.error('Failed to fulfill request', err);
        res.status(500).json({ detail: 'Server error' });
    }
};

exports.deleteRequest = async (req, res) => {
    try {
        await HelpRequest.delete(req.params.id);
        res.json({ message: 'Request cleared successfully' });
    } catch (err) {
        console.error('Failed to delete request', err);
        res.status(500).json({ detail: 'Server error' });
    }
};
