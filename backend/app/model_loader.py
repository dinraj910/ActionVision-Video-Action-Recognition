"""
model_loader.py
---------------
Loads the Keras model from disk exactly once at application startup.
Supports an optional class_labels.txt file; falls back to the 15
UCF-101 classes used during training.
"""

import os
import logging

import tensorflow as tf

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------
# Default class labels – first 15 UCF-101 classes sorted alphabetically.
# These MUST match the order used when the model was trained.
# Override by placing a 'class_labels.txt' file in the model directory.
# -----------------------------------------------------------------------
DEFAULT_CLASS_LABELS: list[str] = [
    "ApplyEyeMakeup",
    "ApplyLipstick",
    "Archery",
    "BabyCrawling",
    "BalanceBeam",
    "BandMarching",
    "BaseballPitch",
    "Basketball",
    "BasketballDunk",
    "BenchPress",
    "Biking",
    "Billiards",
    "BlowDryHair",
    "BlowingCandles",
    "BodyWeightSquats",
]


def load_model_once() -> tuple[tf.keras.Model, list[str]]:
    """
    Load the trained Keras model and resolve class labels.

    Priority for model path:
      1. MODEL_PATH environment variable
      2. ./model/final_video_action_model.keras (relative to CWD)

    Priority for class labels:
      1. LABELS_PATH environment variable
      2. ./model/class_labels.txt
      3. Hard-coded DEFAULT_CLASS_LABELS

    Returns
    -------
    (model, class_labels) : tuple
    """
    model_path = os.getenv(
        "MODEL_PATH",
        os.path.join("model", "final_video_action_model.keras"),
    )

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model file not found at '{model_path}'. "
            "Set the MODEL_PATH environment variable to the correct path."
        )

    logger.info("Loading TF/Keras model from: %s", model_path)
    model = tf.keras.models.load_model(model_path)
    logger.info("Model loaded successfully.")

    # ── Class labels ──────────────────────────────────────────────────
    labels_path = os.getenv(
        "LABELS_PATH",
        os.path.join("model", "class_labels.txt"),
    )

    if os.path.exists(labels_path):
        with open(labels_path, "r", encoding="utf-8") as fh:
            class_labels = [line.strip() for line in fh if line.strip()]
        logger.info(
            "Loaded %d class labels from '%s'.", len(class_labels), labels_path
        )
    else:
        class_labels = DEFAULT_CLASS_LABELS
        logger.warning(
            "Labels file not found at '%s'. Using built-in default labels (%d classes).",
            labels_path,
            len(class_labels),
        )

    return model, class_labels
