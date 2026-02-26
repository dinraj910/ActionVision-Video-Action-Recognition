"""
model_loader.py
---------------
Loads the trained model at application startup.

Why we rebuild the architecture instead of calling load_model()
---------------------------------------------------------------
The .keras file was saved on Google Colab with a specific version of
tf.keras / Keras.  Direct deserialization with tf.keras.models.load_model()
fails on Python 3.12 + TF 2.16 because:
  - Keras 3 (TF 2.16) changed TimeDistributed internals → shape error
  - tf_keras (Keras 2 shim) doesn't recognise the batch_shape key written
    by Keras 3 into the config JSON

Solution: rebuild the *identical* model architecture in code, then load
only the weight values from the .keras zip archive.  This completely
bypasses config deserialisation and is guaranteed to work regardless of
which Keras version saved the file.
"""

import logging
import os
import tempfile
import zipfile

import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2

logger = logging.getLogger(__name__)

# ── Training hyper-parameters (must match the saved model exactly) ─────────
IMG_SIZE        = 224
SEQUENCE_LENGTH = 16
NUM_CLASSES     = 5    # subset of UCF-101 used during training

# -----------------------------------------------------------------------
# Default class labels – the 5 UCF-101 classes the model was trained on.
# Order MUST match the label_to_index mapping used during training.
# Override by placing a 'class_labels.txt' file next to the model.
# -----------------------------------------------------------------------
DEFAULT_CLASS_LABELS: list[str] = [
    "CricketShot",
    "PlayingCello",
    "Punch",
    "ShavingBeard",
    "TennisSwing",
]


# ── Architecture builder ───────────────────────────────────────────────────

def _build_architecture() -> tf.keras.Model:
    """
    Rebuild the exact model architecture used during training:
      TimeDistributed(MobileNetV2) → TimeDistributed(GAP) → GRU(256)
      → Dropout(0.5) → Dense(128, relu) → Dropout(0.5) → Dense(N, softmax)

    MobileNetV2 weights are intentionally NOT pre-loaded here (weights=None)
    because all weights – including the CNN base – will be loaded from the
    .keras archive below.  This avoids a redundant ImageNet download.
    """
    base_model = MobileNetV2(
        weights=None,           # weights come from the .keras file
        include_top=False,
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
    )
    base_model.trainable = False

    model = models.Sequential([
        layers.Input(shape=(SEQUENCE_LENGTH, IMG_SIZE, IMG_SIZE, 3)),
        layers.TimeDistributed(base_model),
        layers.TimeDistributed(layers.GlobalAveragePooling2D()),
        layers.GRU(256),
        layers.Dropout(0.5),
        layers.Dense(128, activation="relu"),
        layers.Dropout(0.5),
        layers.Dense(NUM_CLASSES, activation="softmax"),
    ])
    return model


# ── Weight loader ──────────────────────────────────────────────────────────

def _load_weights_from_keras_file(model: tf.keras.Model, keras_path: str) -> None:
    """
    The .keras format is a ZIP archive containing 'model.weights.h5'.
    Extract that file to a temp directory and call load_weights() on it,
    completely bypassing config deserialisation.

    Falls back to direct load_weights() if the file is not a valid ZIP
    (e.g. legacy HDF5 .keras format).
    """
    try:
        with zipfile.ZipFile(keras_path, "r") as zf:
            names = zf.namelist()
            logger.info("Archive contents: %s", names)

            # Keras 3 → 'model.weights.h5',  older builds may differ
            h5_name = next(
                (n for n in names if n.endswith(".weights.h5") or n.endswith("_weights.h5")),
                None,
            )
            if h5_name is None:
                raise ValueError(
                    f"No weights file found inside archive. Contents: {names}"
                )

            with tempfile.TemporaryDirectory() as tmpdir:
                zf.extract(h5_name, tmpdir)
                weights_path = os.path.join(tmpdir, h5_name)
                model.load_weights(weights_path)
                logger.info("Weights loaded from '%s' inside archive.", h5_name)

    except zipfile.BadZipFile:
        # Plain HDF5 / legacy .keras
        logger.warning(
            "'%s' is not a ZIP archive – attempting direct load_weights().", keras_path
        )
        model.load_weights(keras_path)


# ── Public API ─────────────────────────────────────────────────────────────

def load_model_once() -> tuple[tf.keras.Model, list[str]]:
    """
    Build the model architecture, load weights, and resolve class labels.

    Priority for model path:
      1. MODEL_PATH environment variable
      2. ../model/final_video_action_model.keras (relative to CWD)

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
        os.path.join("..", "model", "final_video_action_model.keras"),
    )

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model file not found at '{model_path}'. "
            "Set the MODEL_PATH environment variable to the correct path."
        )

    logger.info("Rebuilding model architecture…")
    model = _build_architecture()

    logger.info("Loading weights from: %s", model_path)
    _load_weights_from_keras_file(model, model_path)
    logger.info("Model ready.")

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

