const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';
const HF_TOKEN = process.env.HF_TOKEN;

exports.predictImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ detail: "No file uploaded" });
        }

        const filePath = req.file.path;
        console.log(`Received file: ${filePath}`);

        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        console.log(`Forwarding to Python service: ${PYTHON_SERVICE_URL}/predict/image`);

        const response = await axios.post(`${PYTHON_SERVICE_URL}/predict/image`, formData, {
            headers: {
                ...formData.getHeaders(),
                ...(HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {})
            }
        });

        
        try {
            fs.unlinkSync(filePath);
        } catch (e) {
            console.error("Error deleting file", e);
        }

        res.json(response.data);

    } catch (error) {
        console.error('Error calling Python service:', error.message);
        if (error.response) {
            console.error('Python service response:', error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ detail: "Prediction service error" });
        }
    }
};

exports.predictText = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ detail: "No text provided" });
        }

        const formData = new FormData();
        formData.append('text', text);

        const response = await axios.post(`${PYTHON_SERVICE_URL}/predict/text`, formData, {
            headers: {
                ...formData.getHeaders(),
                ...(HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {})
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error calling Python service (text):', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ detail: "Prediction service error" });
        }
    }
};

exports.geocode = async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) return res.status(400).json({ detail: "Address required" });

        const response = await axios.get(`${PYTHON_SERVICE_URL}/predict/geocode`, {
            params: { address },
            headers: {
                ...(HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {})
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error calling Python service (geocode):', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ detail: "Prediction service error" });
        }
    }
};
