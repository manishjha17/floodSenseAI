const User = require('../models/User.model');
const { hashPassword, comparePassword } = require('../utils/Hash.util');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/Auth.middleware');
const cloudinary = require('../config/Cloudinary.config');
const nodemailer = require('nodemailer');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username) return res.status(400).json({ detail: "Username required" });

        const user = await User.findByUsername(username);

        if (!user) return res.status(401).json({ detail: "Invalid credentials" });

        if (user.status === 'pending') {
            return res.status(403).json({ detail: "Account pending admin verification." });
        }

        if (user.role === 'citizen' && !password) {
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ message: "Login successful", token, role: user.role, username: user.username });
        }

        if (!password) return res.status(401).json({ detail: "Password required" });

        if (await comparePassword(password, user.password_hash)) {
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ message: "Login successful", token, role: user.role, username: user.username });
        } else {
            res.status(401).json({ detail: "Invalid credentials" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: "Internal Server Error" });
    }
};

exports.register = async (req, res) => {
    try {
        const {
            role, username, password, full_name, email, phone,
            organization, badge_number, address, id_proof_data,
            security_question, security_answer
        } = req.body;

        if (!username || !password || !role || !security_question || !security_answer) {
            return res.status(400).json({ detail: "Missing required fields" });
        }

        if (await User.findByUsername(username)) return res.status(409).json({ detail: "Username already exists" });
        if (email && await User.findByEmail(email)) return res.status(409).json({ detail: "Email already exists" });
        if (phone && await User.findByPhone(phone)) return res.status(409).json({ detail: "Phone number already exists" });

        const status = role === 'rescuer' ? 'pending' : 'active';

        // Cloudinary Upload Logic for Rescuer ID Proofs
        let idProofUrl = null;
        if (id_proof_data && id_proof_data.startsWith('data:image')) {
            const uploadResponse = await cloudinary.uploader.upload(id_proof_data, {
                folder: 'flood_id_proofs',
            });
            idProofUrl = uploadResponse.secure_url;
            console.log("Uploaded rescuer ID to Cloudinary:", idProofUrl);
        }

        await User.create({
            username,
            passwordHash: await hashPassword(password),
            role,
            fullName: full_name,
            email,
            phone,
            organization,
            badgeNumber: badge_number,
            address,
            idProofUrl: idProofUrl, // Pass cloud URL to model
            status,
            securityQuestion: security_question,
            securityAnswer: security_answer.toLowerCase().trim()
        });

        res.status(201).json({
            message: role === 'rescuer' ? "Rescuer registration submitted for verification." : "Registration successful",
            status
        });

    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ detail: "Internal Server Error" });
    }
};

exports.getPendingRescuers = async (req, res) => {
    try {
        const pending = await User.getPendingRescuers();
        res.json(pending || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: "Internal Server Error" });
    }
};

exports.verifyRescuer = async (req, res) => {
    try {
        const { userId, action } = req.body;
        if (!userId || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ detail: "Invalid request parameters" });
        }

        if (action === 'approve') {
            await User.approveRescuer(userId);
            res.json({ message: "Rescuer approved." });
        } else {
            await User.rejectRescuer(userId);
            res.json({ message: "Rescuer application rejected and deleted." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: "Internal Server Error" });
    }
};

exports.getSecurityQuestion = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ detail: "Username required" });

        const user = await User.getSecurityQuestion(username);
        if (!user) return res.status(404).json({ detail: "User not found" });

        if (!user.security_question) {
            return res.status(400).json({ detail: "No security question set. Please contact an administrator." });
        }

        res.json({ question: user.security_question });
    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ detail: "Internal Server Error" });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { username, security_answer, newPassword } = req.body;
        if (!username || !security_answer || !newPassword) {
            return res.status(400).json({ detail: "Missing required fields" });
        }

        const user = await User.getSecurityAnswer(username);
        if (!user) return res.status(404).json({ detail: "User not found" });

        const providedAnswer = security_answer.toLowerCase().trim();
        const storedAnswer = user.security_answer ? user.security_answer.toLowerCase().trim() : null;

        if (!storedAnswer || providedAnswer !== storedAnswer) {
            return res.status(401).json({ detail: "Incorrect security answer" });
        }

        await User.updatePassword(user.id, await hashPassword(newPassword));

        res.json({ message: "Password reset successfully. You can now log in." });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ detail: "Internal Server Error" });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const username = req.params.username;
        if (!username) return res.status(400).json({ detail: "Username parameter is required" });

        const user = await User.getProfile(username);
        if (!user) return res.status(404).json({ detail: "User not found" });

        res.json(user);
    } catch (err) {
        console.error("Profile fetch error:", err);
        res.status(500).json({ detail: "Internal Server Error" });
    }
};

exports.forgotPasswordOtp = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ detail: "Username required" });

        const user = await User.findByUsername(username);
        if (!user) return res.status(404).json({ detail: "User not found" });

        if (!user.email) {
            return res.status(400).json({ detail: "No email associated with this account." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        const expiry = new Date(Date.now() + 10 * 60000).toISOString();

        await User.saveOTP(username, otp, expiry);

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // upgrade later with STARTTLS
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: user.email,
            subject: 'FloodSense AI - Password Reset OTP',
            text: `Your password reset OTP is: ${otp}. It is valid for 10 minutes.`
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: "OTP sent successfully to your email." });
    } catch (err) {
        console.error("OTP generation error:", err);
        res.status(500).json({ detail: "Internal Server Error while sending OTP" });
    }
};

exports.resetPasswordOtp = async (req, res) => {
    try {
        const { username, otp, newPassword } = req.body;
        if (!username || !otp || !newPassword) {
            return res.status(400).json({ detail: "Missing required fields" });
        }

        const user = await User.verifyOTP(username, otp);
        if (!user) {
            return res.status(401).json({ detail: "Invalid OTP" });
        }

        const expiryDate = new Date(user.reset_otp_expiry);
        if (expiryDate < new Date()) {
            return res.status(401).json({ detail: "OTP has expired" });
        }

        await User.updatePassword(user.id, await hashPassword(newPassword));
        await User.clearOTP(user.id);

        res.json({ message: "Password reset successfully. You can now log in." });
    } catch (err) {
        console.error("Reset password OTP error:", err);
        res.status(500).json({ detail: "Internal Server Error" });
    }
};
