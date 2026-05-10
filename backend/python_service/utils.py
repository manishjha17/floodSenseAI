import os
import torch
from torchvision import models, transforms
from PIL import Image
import io
import pickle
import logging
from geopy.geocoders import Nominatim

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


PYTHON_SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(PYTHON_SERVICE_DIR, "models", "flood_model_4_class.pth")
TEXT_MODEL_PATH = os.path.join(PYTHON_SERVICE_DIR, "text_model.pkl")


def get_coordinates(address):
    geolocator = Nominatim(user_agent="flood_damage_assessment_app_backend")
    try:
        location = geolocator.geocode(address)
        if location:
            return location.latitude, location.longitude
        else:
            return None
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        return None


_image_model = None
_text_model = None
_text_vectorizer = None

CLASS_NAMES = ['Destroyed', 'No Damage', 'Low Damage', 'Medium Damage']

def load_image_model():
    global _image_model
    if _image_model is not None:
        return _image_model

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    try:
        model = models.efficientnet_b0(weights=None)
        num_ftrs = model.classifier[1].in_features
        model.classifier[1] = torch.nn.Linear(num_ftrs, 4)
        
        if os.path.exists(MODEL_PATH):
            model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
            model.eval()
            _image_model = model
            logger.info(f"Loaded image model from {MODEL_PATH}")
        else:
            logger.error(f"Model file not found at {MODEL_PATH}")
            return None
    except Exception as e:
        import traceback
        logger.error(f"Error loading image model: {e}")
        logger.error(traceback.format_exc())
        return None
    return _image_model

def load_text_model():
    global _text_model, _text_vectorizer
    if _text_model is not None:
        return _text_model, _text_vectorizer

    try:
        if os.path.exists(TEXT_MODEL_PATH):
            with open(TEXT_MODEL_PATH, 'rb') as f:
                data = pickle.load(f)
                _text_model = data['model']
                _text_vectorizer = data['vectorizer']
            logger.info(f"Loaded text model from {TEXT_MODEL_PATH}")
        else:
            logger.error(f"Text model file not found at {TEXT_MODEL_PATH}")
            return None, None
    except Exception as e:
        logger.error(f"Error loading text model: {e}")
        return None, None
    return _text_model, _text_vectorizer

def predict_image(image_bytes):
    model = load_image_model()
    if not model:
        return None, 0.0

    preprocess = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_t = preprocess(image)
        batch_t = torch.unsqueeze(img_t, 0)

        with torch.no_grad():
            out = model(batch_t)
            probabilities = torch.nn.functional.softmax(out, dim=1)
            confidence, predicted_idx = torch.max(probabilities, 1)

        predicted_class = CLASS_NAMES[predicted_idx.item()]
        return predicted_class, confidence.item()
    except Exception as e:
        import traceback
        logger.error(f"Prediction error: {e}")
        logger.error(traceback.format_exc())
        return None, 0.0

def predict_text(text):
    model, vectorizer = load_text_model()
    if not model or not vectorizer:
        return None, 0.0
    
    try:
        text_vec = vectorizer.transform([text])
        prediction = model.predict(text_vec)[0]
        
        probabilities = model.predict_proba(text_vec)
        confidence = max(probabilities[0])
        
        return prediction, confidence
    except Exception as e:
        logger.error(f"Text prediction error: {e}")
        return None, 0.0
