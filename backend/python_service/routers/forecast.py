from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import logging
import joblib
import pandas as pd
import os

router = APIRouter()
logger = logging.getLogger(__name__)

# Load Machine Learning Model globally
ML_MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "flood_model.pkl")
ML_FEATURES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "model_features.pkl")

ml_model = None
ml_features = None

try:
    if os.path.exists(ML_MODEL_PATH) and os.path.exists(ML_FEATURES_PATH):
        ml_model = joblib.load(ML_MODEL_PATH)
        ml_features = joblib.load(ML_FEATURES_PATH)
        logger.info("✅ Successfully loaded Random Forest model and features.")
    else:
        logger.warning(f"⚠️ ML Model files not found. Will fallback to heuristics if needed.")
except Exception as e:
    logger.error(f"❌ Error loading ML model: {e}")

class ForecastRequest(BaseModel):
    latitude: float
    longitude: float

import asyncio

@router.post("/")
async def get_flood_prediction(request: ForecastRequest):
    """
    Fetches comprehensive environmental data from Open-Meteo API suite.
    Calculates a flood prediction risk score based on:
    - 7-Day Precipitation
    - Soil Moisture Saturation
    - River Discharge (GloFAS)
    - Elevation (Topography)
    """
    logger.info(f"Fetching advanced flood prediction for lat: {request.latitude}, lon: {request.longitude}")
    
    weather_url = "https://api.open-meteo.com/v1/forecast"
    flood_url = "https://flood-api.open-meteo.com/v1/flood"
    elevation_url = "https://api.open-meteo.com/v1/elevation"

    weather_params = {
        "latitude": request.latitude,
        "longitude": request.longitude,
        "daily": ["precipitation_sum"], 
        "hourly": ["soil_moisture_3_to_9cm"], 
        "timezone": "auto"
    }
    
    flood_params = {
        "latitude": request.latitude,
        "longitude": request.longitude,
        "daily": ["river_discharge"],
        "timezone": "auto"
    }
    
    elevation_params = {
        "latitude": request.latitude,
        "longitude": request.longitude
    }

    try:
        async with httpx.AsyncClient() as client:
            # Fetch all three APIs concurrently for high performance
            weather_task = client.get(weather_url, params=weather_params)
            flood_task = client.get(flood_url, params=flood_params)
            elevation_task = client.get(elevation_url, params=elevation_params)
            
            responses = await asyncio.gather(weather_task, flood_task, elevation_task, return_exceptions=True)
            
            # Error checking for individual APIs
            for resp in responses:
                if isinstance(resp, Exception):
                    logger.error(f"Error fetching from external API: {resp}")
                    continue
                resp.raise_for_status()
                
            weather_data = responses[0].json() if not isinstance(responses[0], Exception) else {}
            flood_data = responses[1].json() if not isinstance(responses[1], Exception) else {}
            elevation_data = responses[2].json() if not isinstance(responses[2], Exception) else {}
            
            # --- Extract Data ---
            w_daily = weather_data.get("daily", {})
            w_hourly = weather_data.get("hourly", {})
            f_daily = flood_data.get("daily", {})
            
            time_arr = w_daily.get("time", [])
            precipitation_arr = w_daily.get("precipitation_sum", [])
            soil_moisture_arr = w_hourly.get("soil_moisture_3_to_9cm", [])
            river_discharge_arr = f_daily.get("river_discharge", [])
            
            # Elevation comes back as a single array of heights in meters
            elevation_list = elevation_data.get("elevation", [0])
            elevation = elevation_list[0] if elevation_list else 0

            # --- Extract Metrics for UI & ML ---
            valid_precip = [p for p in precipitation_arr if p is not None]
            total_rainfall = sum(valid_precip) if valid_precip else 0
            max_daily_rainfall = max(valid_precip) if valid_precip else 0
            
            avg_soil_moisture = 0
            valid_moisture = [sm for sm in soil_moisture_arr if sm is not None]
            if valid_moisture:
                avg_soil_moisture = sum(valid_moisture) / len(valid_moisture)
                
            valid_river = [r for r in river_discharge_arr if r is not None]
            max_river_discharge = max(valid_river) if valid_river else 0

            # --- Machine Learning Prediction (Random Forest) ---
            risk_score = 15 # Default fallback
            warning_messages = []
            algorithm_used = "Heuristic Fallback"

            if ml_model and ml_features:
                try:
                    # Construct DataFrame with exactly the features the model expects
                    input_dict = {
                        "Latitude": [request.latitude],
                        "Longitude": [request.longitude],
                        "Rainfall": [total_rainfall],
                        "Elevation": [elevation],
                        "Slope": [10.0] # Default heuristic fallback for missing Kaggle column
                    }
                    input_df = pd.DataFrame(input_dict)
                    
                    # Ensure columns exactly match the training dataset
                    for col in ml_features:
                        if col not in input_df.columns:
                            input_df[col] = 0.0
                    input_df = input_df[ml_features]

                    # Predict probability of Flood (Class 1)
                    prob_array = ml_model.predict_proba(input_df)
                    flood_prob = prob_array[0][1] * 100
                    
                    risk_score = int(round(flood_prob))
                    algorithm_used = "Random Forest ML Classifier"
                    logger.info(f"ML Prediction Initial Score: {risk_score}% Risk")
                    
                    # --- SMART HEURISTIC OVERRIDES ---
                    override_applied = False
                    
                    # Rule 1: Bone dry override. No rain and low river discharge means negligible risk.
                    if total_rainfall < 10 and max_river_discharge < 300:
                        risk_score = min(risk_score, 8) 
                        algorithm_used += " (Dry Weather Override)"
                        override_applied = True
                        
                    # Rule 2: Extreme river discharge override. Huge volume means imminent flood regardless of ML.
                    if max_river_discharge > 500:
                        risk_score = max(risk_score, 90)
                        algorithm_used += " (Extreme River Discharge Override)"
                        override_applied = True
                        
                    # Rule 3: Extreme Rainfall (Flash Flood). Immediate heavy rain triggers severe risk.
                    if max_daily_rainfall > 100 or total_rainfall > 150:
                        risk_score = max(risk_score, 90)
                        algorithm_used += " (Extreme Rainfall Override)"
                        override_applied = True
                        
                    # Rule 4: High saturation + Incoming rain. Ground can't absorb water, pushing risk higher.
                    if total_rainfall > 30 and avg_soil_moisture > 0.4:
                        risk_score = min(int(risk_score * 1.5), 95)
                        algorithm_used += " (High Saturation Multiplier)"
                        override_applied = True
                        
                    if override_applied:
                        logger.info(f"Final Score after Heuristic Overrides: {risk_score}% Risk")
                    logger.info(f"ML Prediction Successful: {risk_score}% Risk")
                    
                except Exception as ml_err:
                    logger.error(f"ML Model inference failed: {ml_err}. Falling back to default risk.")
            
            # Map Risk Score to Category & Append Dynamic Warnings
            if risk_score >= 80:
                risk_category = "Severe"
                warning_messages.append(f"CRITICAL: Machine Learning model predicts an {risk_score}% probability of severe flooding based on historical pattern data.")
                if elevation < 15:
                    warning_messages.append(f"AGGRAVATING FACTOR: Low elevation ({elevation}m a.s.l) compounds structural flood vulnerability.")
            elif risk_score >= 50:
                risk_category = "High"
                warning_messages.append(f"WARNING: High probability ({risk_score}%) of flooding detected by AI model. Prepare mitigation protocols.")
            elif risk_score >= 25:
                risk_category = "Moderate"
                warning_messages.append(f"ADVISORY: Moderate chance ({risk_score}%) of localized pooling or minor road disruption.")
            else:
                risk_category = "Low"
                warning_messages.append(f"INFO: AI Predicts low flood probability ({risk_score}%). Environmental conditions appear normal.")

            # Create the response payload
            chart_data = []
            for i in range(len(time_arr)):
                chart_data.append({
                    "date": time_arr[i],
                    "precipitation": precipitation_arr[i] if len(precipitation_arr) > i and precipitation_arr[i] is not None else 0
                })

            return {
                "algorithm": algorithm_used,
                "risk_score": risk_score,
                "risk_category": risk_category,
                "warnings": warning_messages,
                "metrics": {
                    "total_rainfall_7d_mm": round(total_rainfall, 2),
                    "max_daily_rainfall_mm": round(max_daily_rainfall, 2),
                    "avg_soil_moisture": round(avg_soil_moisture, 3),
                    "max_river_discharge_m3s": round(max_river_discharge, 2),
                    "elevation_meters": round(elevation, 1)
                },
                "daily_forecast": chart_data
            }

    except Exception as e:
        logger.error(f"Unexpected error in advanced prediction: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during comprehensive flood prediction.")
