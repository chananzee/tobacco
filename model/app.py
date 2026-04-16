from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
from PIL import Image, UnidentifiedImageError
import io

# ==============================================================================
# Patch from_config ของ Dense และ Layer ทั่วไป
# เพื่อลบ quantization_config ที่ Keras เวอร์ชันเก่าไม่รู้จัก
_original_dense_from_config = tf.keras.layers.Dense.from_config.__func__

@classmethod
def _patched_dense_from_config(cls, config):
    config.pop('quantization_config', None)
    return _original_dense_from_config(cls, config)

tf.keras.layers.Dense.from_config = _patched_dense_from_config

# Patch Layer base class ด้วย เผื่อ layer อื่นมีปัญหาเดียวกัน
_original_layer_from_config = tf.keras.layers.Layer.from_config.__func__

@classmethod
def _patched_layer_from_config(cls, config):
    config.pop('quantization_config', None)
    return _original_layer_from_config(cls, config)

tf.keras.layers.Layer.from_config = _patched_layer_from_config
# ==============================================================================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading model...")
model = tf.keras.models.load_model('final_model.keras', compile=False)
print("Model loaded successfully!")

CLASS_NAMES = ["โรคใบจุด", "ใบปกติ", "ไวรัสโมสาก", "โรคใบเหี่ยว"]

IMG_SIZE = (224, 224)


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="ไม่สามารถอ่านไฟล์รูปภาพได้")

    image = image.resize(IMG_SIZE)
    
    # ---------------------------------------------------------
    # แก้ไขแล้ว: ลบการหาร / 255.0 ออก ป้องกัน Double Normalization 
    # เนื่องจากโมเดลมี layer Rescaling(1./127.5, offset=-1) อยู่แล้ว
    # ---------------------------------------------------------
    img_array = np.array(image, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)

    predictions = model.predict(img_array, verbose=0)[0]
    predicted_index = int(np.argmax(predictions))
    predicted_class = CLASS_NAMES[predicted_index]
    confidence = round(float(predictions[predicted_index]) * 100, 2)

    all_confidences = {
        CLASS_NAMES[i]: round(float(predictions[i]) * 100, 2)
        for i in range(len(CLASS_NAMES))
    }

    return {
        "disease": predicted_class,
        "confidence": confidence,
        "all_confidences": all_confidences,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "classes": CLASS_NAMES}

###uvicorn app:app --reload