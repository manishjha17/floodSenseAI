const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here'; // Fallback for dev

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    // Check if the auth header starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ detail: "A token is required for authentication" });
    }

    // Extract the token part
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach the decoded user payload to the request
    } catch (err) {
        return res.status(401).json({ detail: "Invalid Token" });
    }
    
    return next();
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ detail: "Admin privileges required" });
        }
        return next();
    });
};

module.exports = { verifyToken, verifyAdmin, JWT_SECRET };
