import asyncio
import gc
import hmac
import io
import logging
import os
import threading
from pathlib import Path

os.environ.setdefault("HF_HOME", str(Path(__file__).resolve().parent / "models" / "huggingface"))

try:
    import spaces

    @spaces.GPU
    def _zerogpu_ready():
        return True
except Exception:
    spaces = None

import numpy as np
import torch
import timm
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from huggingface_hub import hf_hub_download
from PIL import Image, ImageOps, UnidentifiedImageError
from transformers import AutoImageProcessor, AutoModelForImageClassification


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("trimmer-ai")

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

MODELS = {
    "skin": {
        "id": "charuka0/acne-multilabel-classifier",
        "revision": "37b19c063c70834381451a950681f9078461a2e0",
    },
    "hair": {
        "id": "dima806/hair_type_image_detection",
        "revision": "c918d5859f6830e667edd0aa4260703ea11a8d10",
    },
    "beard": {
        "id": "dima806/beard_face_image_detection",
        "revision": "f13217aeacd0a42fee035b903681cbf7fdf1e1e7",
    },
}

_loaded_models = {}
_model_lock = threading.Lock()
_inference_lock = threading.Lock()
_configured_api_key = os.environ.get("AI_SERVICE_API_KEY", "")
torch.set_num_threads(min(4, os.cpu_count() or 1))

app = FastAPI(title="Trimmer AI", docs_url=None, redoc_url=None)


def _require_service_key(authorization: str | None = Header(default=None)):
    if not _configured_api_key:
        return
    expected = f"Bearer {_configured_api_key}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Authentication required.")


def decode_image(data: bytes) -> Image.Image:
    if not data:
        raise HTTPException(status_code=400, detail="Choose a non-empty image.")
    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                raise HTTPException(status_code=400, detail="Upload a JPEG, PNG, or WebP image.")
            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=400, detail="Image dimensions are too large.")
            image.verify()
        with Image.open(io.BytesIO(data)) as image:
            return ImageOps.exif_transpose(image).convert("RGB")
    except HTTPException:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning, OSError) as error:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid supported image.") from error


def _load_model(category: str):
    with _model_lock:
        if category in _loaded_models:
            return _loaded_models[category]

        if _loaded_models:
            _loaded_models.clear()
            gc.collect()

        model_info = MODELS[category]
        cache_dir = str(Path(os.environ["HF_HOME"]) / "hub")
        try:
            if category == "skin":
                checkpoint_path = hf_hub_download(
                    model_info["id"],
                    "best_model.pth",
                    revision=model_info["revision"],
                    cache_dir=cache_dir,
                )
                checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
                classes = checkpoint["classes"]
                thresholds = checkpoint["thresholds"]
                if (
                    checkpoint["backbone"] != "efficientnet_b0"
                    or not isinstance(classes, list)
                    or len(classes) != 5
                    or len(thresholds) != len(classes)
                ):
                    raise ValueError("Unexpected acne model checkpoint format.")
                model = timm.create_model(
                    checkpoint["backbone"],
                    pretrained=False,
                    num_classes=len(classes),
                )
                model.load_state_dict(checkpoint["model_state_dict"], strict=True)
                model.eval()
                loaded = {
                    "model": model,
                    "classes": classes,
                    "thresholds": thresholds,
                    "image_size": int(checkpoint["img_size"]),
                }
            else:
                processor = AutoImageProcessor.from_pretrained(
                    model_info["id"],
                    revision=model_info["revision"],
                    cache_dir=cache_dir,
                    trust_remote_code=False,
                )
                model = AutoModelForImageClassification.from_pretrained(
                    model_info["id"],
                    revision=model_info["revision"],
                    cache_dir=cache_dir,
                    trust_remote_code=False,
                    use_safetensors=True,
                    low_cpu_mem_usage=True,
                )
                model.eval()
                loaded = {"model": model, "processor": processor}
        except Exception as error:
            logger.exception("Could not load the %s assessment model.", category)
            raise HTTPException(
                status_code=503,
                detail=f"The {category} model could not be loaded. Check the AI service logs and try again.",
            ) from error

        _loaded_models[category] = loaded
        return loaded


def predict_image(category: str, image: Image.Image) -> dict:
    with _inference_lock:
        return _predict_image(category, image)


def _predict_image(category: str, image: Image.Image) -> dict:
    loaded = _load_model(category)
    model_info = MODELS[category]

    try:
        with torch.inference_mode():
            if category == "skin":
                size = loaded["image_size"]
                resized = image.resize((size, size), Image.Resampling.BILINEAR)
                pixels = np.asarray(resized, dtype=np.float32) / 255.0
                mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
                standard_deviation = np.array([0.229, 0.224, 0.225], dtype=np.float32)
                normalized = (pixels - mean) / standard_deviation
                input_tensor = torch.from_numpy(normalized).permute(2, 0, 1).unsqueeze(0)
                probabilities = torch.sigmoid(loaded["model"](input_tensor))[0].cpu().tolist()
                predictions = [
                    {
                        "label": label,
                        "score": round(float(score), 6),
                        "detected": float(score) >= threshold,
                    }
                    for label, score, threshold in zip(
                        loaded["classes"], probabilities, loaded["thresholds"], strict=True
                    )
                ]
            else:
                inputs = loaded["processor"](images=image, return_tensors="pt")
                logits = loaded["model"](**inputs).logits[0]
                probabilities = torch.softmax(logits, dim=-1).cpu().tolist()
                labels = [
                    loaded["model"].config.id2label.get(index)
                    or loaded["model"].config.id2label.get(str(index))
                    for index in range(len(probabilities))
                ]
                best_index = int(np.argmax(probabilities))
                predictions = [
                    {
                        "label": label,
                        "score": round(float(score), 6),
                        "detected": index == best_index,
                    }
                    for index, (label, score) in enumerate(zip(labels, probabilities, strict=True))
                ]
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("The %s assessment model failed during inference.", category)
        raise HTTPException(status_code=503, detail=f"The {category} model could not analyze this image.") from error

    return {
        "category": category,
        "modelId": model_info["id"],
        "modelRevision": model_info["revision"],
        "predictions": predictions,
    }


@app.get("/")
async def root():
    return {"status": "ok", "service": "trimmer-ai"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/predict", dependencies=[Depends(_require_service_key)])
async def predict(
    category: str = Form(...),
    image: UploadFile = File(...),
):
    if category not in MODELS:
        raise HTTPException(status_code=400, detail="Choose skin, hair, or beard.")
    content = await image.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Images must be 5 MB or smaller.")
    decoded = decode_image(content)
    return await asyncio.to_thread(predict_image, category, decoded)


if __name__ == "__main__":
    import uvicorn

    if spaces is not None and getattr(getattr(spaces, "config", None), "Config", None) is not None:
        try:
            if spaces.config.Config.zero_gpu:
                spaces.zero.torch.pack()
                spaces.zero.client.startup_report()
        except Exception as exc:
            logger.warning("ZeroGPU startup report skipped: %s", exc)

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "7860")))


