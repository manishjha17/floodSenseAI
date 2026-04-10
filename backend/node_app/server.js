require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
// CORS Security Configuration
const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL] 
    : ['http://localhost:5173']; // Default to local dev if not set

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like server-to-server) or matching allowed origins
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.warn(`Blocked CORS request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Routes
const authRoutes = require('./routes/Auth.routes');
const predictRoutes = require('./routes/Predict.routes');
const feedbackRoutes = require('./routes/Feedback.routes');
const reportRoutes = require('./routes/Report.routes');
const resourcesRoutes = require('./routes/Resources.routes');
const helpRoutes = require('./routes/Help.routes');
const forecastRoutes = require('./routes/Forecast.routes');
const initDb = require('./init_db');

// Initialize DB
initDb();

app.use('/auth', authRoutes);
app.use('/predict', predictRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/report', reportRoutes);
app.use('/resources', resourcesRoutes);
app.use('/help', helpRoutes);
app.use('/forecast', forecastRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Flood Damage Assessment API (Node.js) is running" });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
