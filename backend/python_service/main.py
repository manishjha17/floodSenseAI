from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import predict, forecast
import logging
import sys
import os


sys.path.append(os.path.dirname(os.path.abspath(__file__)))


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Flood Damage Assessment ML Service")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/predict", tags=["Prediction"])
app.include_router(forecast.router, prefix="/forecast", tags=["Prediction"])

@app.get("/")
def read_root():
    return {"message": "Flood Damage Assessment ML Service is running"}
