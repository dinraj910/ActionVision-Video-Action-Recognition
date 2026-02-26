"""
predictor.py
------------
Frame extraction and inference pipeline.

Flow:
  video file → extract 16 frames uniformly → normalize → batch →
  model.predict() → (action_label, confidence)
"""

import logging

import cv2
import numpy as np
import tensorflow as tf

logger = logging.getLogger(__name__)

# Must match model input shape used during training
IMG_SIZE: int = 224
SEQUENCE_LENGTH: int = 16


# ---------------------------------------------------------------------------
# Frame extraction
# ---------------------------------------------------------------------------

def extract_frames_uniform(
    video_path: str,
    num_frames: int = SEQUENCE_LENGTH,
) -> np.ndarray:
    """
    Sample exactly `num_frames` frames from the video using uniform
    segment-based sampling (deterministic, no jitter – suitable for inference).

    Each frame is:
      - Resized to (IMG_SIZE × IMG_SIZE)
      - Converted from BGR to RGB

    Parameters
    ----------
    video_path : str
        Absolute path to the temporary video file.
    num_frames : int
        Number of frames to extract (must match model's sequence_length).

    Returns
    -------
    np.ndarray  shape (num_frames, IMG_SIZE, IMG_SIZE, 3), dtype float32
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if total_frames < 1:
        cap.release()
        raise ValueError("Video has no readable frames.")

    if total_frames < num_frames:
        logger.warning(
            "Video contains only %d frames, fewer than required %d. "
            "Frames will be repeated via index clamping.",
            total_frames,
            num_frames,
        )

    # Compute the centre of each uniform segment
    segment_size = total_frames / num_frames
    frame_indices = [
        min(int(i * segment_size + segment_size / 2), total_frames - 1)
        for i in range(num_frames)
    ]

    frames: list[np.ndarray] = []

    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()

        if not ret:
            logger.warning(
                "Could not read frame at index %d; substituting previous frame.", idx
            )
            # Substitute with the last valid frame (or a black frame on first failure)
            frames.append(
                frames[-1].copy()
                if frames
                else np.zeros((IMG_SIZE, IMG_SIZE, 3), dtype=np.uint8)
            )
            continue

        frame = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frames.append(frame)

    cap.release()

    return np.array(frames, dtype=np.float32)   # (T, H, W, 3)


# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------

def preprocess_frames(frames: np.ndarray) -> np.ndarray:
    """
    Normalize pixel values to [0, 1] and add the batch dimension.

    Parameters
    ----------
    frames : np.ndarray  shape (T, H, W, 3)

    Returns
    -------
    np.ndarray  shape (1, T, H, W, 3)
    """
    frames = frames / 255.0                  # scale to [0, 1]
    return np.expand_dims(frames, axis=0)    # add batch dim


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

def predict_action(
    video_path: str,
    model: tf.keras.Model,
    class_labels: list[str],
) -> tuple[str, float]:
    """
    End-to-end prediction pipeline.

    Parameters
    ----------
    video_path   : str             Path to the video file.
    model        : tf.keras.Model  Loaded Keras model.
    class_labels : list[str]       Ordered list of class names.

    Returns
    -------
    (action, confidence) : tuple[str, float]
        action     – Human-readable class name.
        confidence – Softmax probability for the predicted class [0, 1].

    Raises
    ------
    ValueError  For malformed videos or index mismatches.
    """
    frames = extract_frames_uniform(video_path, SEQUENCE_LENGTH)
    batch = preprocess_frames(frames)            # (1, 16, 224, 224, 3)

    # Inference – verbose=0 suppresses progress bar in logs
    predictions: np.ndarray = model.predict(batch, verbose=0)   # (1, C)

    class_idx: int = int(np.argmax(predictions[0]))
    confidence: float = float(predictions[0][class_idx])

    if class_idx >= len(class_labels):
        raise ValueError(
            f"Model output class index {class_idx} is out of range "
            f"for label list with {len(class_labels)} entries."
        )

    action = class_labels[class_idx]
    return action, confidence
