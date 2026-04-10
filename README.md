# floodSense AI: Flood Damage Assessment Platform

floodSenseAI is a full-stack, AI-powered platform designed to automate and accelerate flood damage assessments. It combines satellite/image classification with text-based reporting to provide rapid insights for first responders and insurance auditors.

## 🚀 Key Features
- **AI Image Classification**: Uses a PyTorch-based EfficientNet-B0 model to categorize structural damage into 4 levels: *Destroyed, Medium Damage, Low Damage, and No Damage*.
- **Text Analysis**: Employs a Naive Bayes classifier to process witness reports and extract critical damage metadata.
- **Emergency Help System**: Real-time help request tracking for rescuers and victims.
- **Automated PDF Reports**: Generates professional damage assessment reports with maps and confidence scores.
- **Admin Dashboard**: Comprehensive auditing tools for labeling feedback and exporting datasets for model retraining.

## 🛠️ Technology Stack
- **Frontend**: React (Vite), Axios, Tailwind CSS.
- **Backend (Node.js)**: Express.js, JWT Authentication, PostgreSQL (Neon).
- **Backend (Python)**: FastAPI, PyTorch (Image AI), Scikit-Learn (Text AI).
- **Cloud Storage**: Cloudinary (Image hosting).
- **Database**: PostgreSQL on Neon.tech.

## 📂 Project Structure
- `/frontend`: React client application.
- `/backend/node_app`: Main API gateway and user management.
- `/backend/python_service`: Machine learning models and prediction logic.
- `/backend/python_service/models`: Pickled (.pkl) and weight (.pth) files for AI.

## 🚜 Local Setup
1. **Repository Setup**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/flood-damage-assessment.git
   cd flood-damage-assessment
   ```
2. **Setup Backends**:
   - Navigate to `backend/node_app`, run `npm install`.
   - Navigate to `backend/python_service`, run `pip install -r requirements.txt`.
3. **Setup Frontend**:
   - Navigate to `frontend`, run `npm install`.
4. **Environment Variables**:
   - Copy `.env.example` to `.env` in both backend and frontend and fill in your Cloudinary and Database credentials.

## ☁️ Deployment
This project is optimized for deployment on:
- **Render** (Node & Python Services)
- **Vercel** (React Frontend)
- **Neon.tech** (PostgreSQL)

---
*Created as a capstone project for the Flood Damage Assessment AI initiative.*
