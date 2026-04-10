const axios = require('axios');

exports.getForecast = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        
        if (!latitude || !longitude) {
             return res.status(400).json({ error: "Latitude and longitude are required." });
        }

        console.log(`[Forecast Request] Forwarding to Python API: Lat ${latitude}, Lon ${longitude}`);

        const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';
        const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/forecast/`, {
            latitude,
            longitude
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
