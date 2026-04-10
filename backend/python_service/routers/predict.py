from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from utils import predict_image, predict_text, get_coordinates

router = APIRouter()

@router.post("/image")
async def analyze_image(file: UploadFile = File(...)):
    contents = await file.read()
    print(f"Received image for prediction. Size: {len(contents)} bytes")
    prediction, confidence = predict_image(contents)
    
    if prediction is None:
        raise HTTPException(status_code=500, detail="Error processing image")
    
    print(f"Prediction: {prediction}, Confidence: {confidence}")
    return {"prediction": prediction, "confidence": confidence}

@router.post("/text")
async def analyze_text(text: str = Form(...)):
    prediction, confidence = predict_text(text)
    if prediction is None:
        return {"prediction": "Unknown", "confidence": 0.0} 
    return {"prediction": str(prediction), "confidence": confidence}

@router.get("/geocode")
async def geocode_address(address: str):
    coords = get_coordinates(address)
    if coords:
        return {"lat": coords[0], "lon": coords[1]}
    else:
        raise HTTPException(status_code=404, detail="Address not found")
