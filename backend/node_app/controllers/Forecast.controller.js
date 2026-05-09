const axios = require('axios');

exports.searchLocation = async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) {
            return res.status(400).json({ error: "Location name is required." });
        }

        console.log(`[Geocoding Request] Proxying search for: ${name}`);

        // Call Open-Meteo Geocoding API from the server
        const response = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&format=json`);

        res.json(response.data);
    } catch (error) {
        console.error('[Geocoding Error] Failed to reach geocoding service:', error.message);
        res.status(500).json({ error: "Geocoding service unavailable" });
    }
};

exports.getForecast = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        
        if (!latitude || !longitude) {
             return res.status(400).json({ error: "Latitude and longitude are required." });
        }

        console.log(`[Forecast Request] Forwarding to Python API: Lat ${latitude}, Lon ${longitude}`);

        const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';
        const HF_TOKEN = process.env.HF_TOKEN;

        const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/forecast/`, {
            ...req.body
        }, {
            headers: {
                ...(HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {})
            }
        });

        res.json(pythonResponse.data);
    } catch (error) {
        console.error('[Forecast Error] Failed to communicate with Python predictive service:', error.message);
        
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        
        res.status(500).json({ error: "Failed to fetch flood prediction from ML engine" });
    }
};
