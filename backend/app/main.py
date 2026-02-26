"""
main.py
-------
FastAPI application entry point for ActionVision.

Key decisions:
  - Model loaded ONCE at startup via the lifespan context manager
    (avoids re-loading on every request).
  - Upload size is capped at MAX_UPLOAD_SIZE (env-configurable).
  - Temporary files are always cleaned up in a `finally` block.
  - CORS origins are env-configurable for production deployments.
"""

import logging
import os
import tempfile
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.model_loader import load_model_once
from app.predictor import predict_action

# ── Environment & logging ──────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)

# ── Constants ───────────────────────────────────────────────────────────────

# 100 MB default; override via MAX_UPLOAD_MB env var
MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_MB", 100)) * 1024 * 1024

ALLOWED_CONTENT_TYPES: set[str] = {
    "video/mp4",
    "video/avi",
    "video/x-msvideo",    # alternative AVI MIME
    "video/quicktime",    # .mov
    "video/webm",
    "video/x-matroska",   # .mkv
    "application/octet-stream",  # browsers sometimes send this for .avi
}

# ── Application state (holds the model between requests) ───────────────────
_app_state: dict = {}


# ── Lifespan (replaces deprecated @app.on_event) ──────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the ML model on startup; release resources on shutdown."""
    logger.info("Starting ActionVision API – loading model…")
    _app_state["model"], _app_state["class_labels"] = load_model_once()
    logger.info(
        "Model ready. %d classes: %s",
        len(_app_state["class_labels"]),
        _app_state["class_labels"],
    )
    yield
    logger.info("Shutting down ActionVision API.")


# ── FastAPI app ────────────────────────────────────────────────────────────
app = FastAPI(
    title="ActionVision API",
    description=(
        "Real-Time Video Action Recognition using "
        "MobileNetV2 (feature extractor) + GRU (temporal modelling). "
        "Trained on UCF-101."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS – allow all origins by default; restrict in production via ALLOWED_ORIGINS env var
_raw_origins: str = os.getenv("ALLOWED_ORIGINS", "*")
_origins: list[str] = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Ops"])
async def health_check():
    """
    Lightweight liveness probe.
    Returns 200 + model status so load-balancers / monitors can verify
    both the server AND the model are ready.
    """
    return {
        "status": "ok",
        "model_loaded": "model" in _app_state,
        "num_classes": len(_app_state.get("class_labels", [])),
    }


@app.post("/predict", tags=["Inference"])
async def predict(file: UploadFile = File(...)):
    """
    Accept a video upload and return the predicted action class + confidence.

    Request
    -------
    multipart/form-data  field: `file`  (video/mp4, video/avi, etc.)

    Response 200
    ------------
    ```json
    { "action": "CricketShot", "confidence": 0.9984 }
    ```

    Error codes
    -----------
    400 – Unsupported file type
    413 – File exceeds size limit
    422 – Video cannot be processed (too short, corrupted, etc.)
    500 – Unexpected internal error
    """
    # ── 1. Validate content type ───────────────────────────────────────
    # Extract base MIME type (before ';' parameter like codecs)
    # e.g., 'video/webm;codecs=vp9' → 'video/webm'
    base_content_type = file.content_type.split(';')[0].strip()
    
    if base_content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: '{file.content_type}'. "
                f"Allowed types: {sorted(ALLOWED_CONTENT_TYPES)}"
            ),
        )

    # ── 2. Read bytes & enforce size limit ─────────────────────────────
    contents: bytes = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File size {len(contents) / (1024 * 1024):.1f} MB exceeds "
                f"the {MAX_UPLOAD_SIZE // (1024 * 1024)} MB limit."
            ),
        )

    logger.info(
        "Received '%s' | type=%s | size=%.1f KB",
        file.filename,
        file.content_type,
        len(contents) / 1024,
    )

    # ── 3. Persist bytes to a temp file for OpenCV ─────────────────────
    suffix = os.path.splitext(file.filename or "upload")[-1] or ".mp4"
    tmp_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        # ── 4. Run inference ───────────────────────────────────────────
        action, confidence = predict_action(
            tmp_path,
            _app_state["model"],
            _app_state["class_labels"],
        )

        logger.info("Prediction: %s (confidence=%.4f)", action, confidence)
        return JSONResponse(
            content={"action": action, "confidence": round(confidence, 4)}
        )

    except ValueError as exc:
        logger.warning("Prediction value error: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    except Exception as exc:
        logger.exception("Unexpected error during prediction: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during inference.",
        ) from exc

    finally:
        # Always delete the temporary file, even on error
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
            logger.debug("Deleted temp file: %s", tmp_path)
