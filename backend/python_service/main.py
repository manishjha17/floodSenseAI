from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import predict, forecast
import logging
import sys
import os

# Add current directory to sys.path to ensure imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Flood Damage Assessment ML Service")

# Configure CORS (Restrict in production)
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
node_url = os.getenv("NODE_SERVICE_URL", "http://localhost:8000")

origins = [
    frontend_url,
    node_url,
    "http://localhost:5173",
    "http://localhost:8000",
]

# If explicitly set to * in environment, allow all
if frontend_url == "*" or node_url == "*":
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/predict", tags=["Prediction"])
app.include_router(forecast.router, prefix="/forecast", tags=["Prediction"])

@app.get("/")
def read_root():
    return {"message": "Flood Damage Assessment ML Service is running"}
