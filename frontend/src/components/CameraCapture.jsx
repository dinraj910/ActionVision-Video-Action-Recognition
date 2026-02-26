// src/components/CameraCapture.jsx
// -----------------------------------------------------------------------
// Live camera recording via MediaDevices API.
//
// Flow:
//   1. User clicks "Start Camera" → getUserMedia() opens camera stream
//   2. User clicks "Start Recording" → MediaRecorder captures video
//   3. User clicks "Stop" → recording saved as a Blob
//   4. Preview shown; user can click "Predict" or discard and re-record
// -----------------------------------------------------------------------

import { useRef, useState, useEffect, useCallback } from 'react';
import './CameraCapture.css';

// Preferred MIME type order; browser picks the first it supports
const PREFERRED_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];

function getSupportedMimeType() {
  return (
    PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || ''
  );
}

/**
 * @param {{
 *   onSubmit: (file: File, onProgress: (n: number) => void) => Promise<void>,
 *   loading: boolean,
 * }} props
 */
export default function CameraCapture({ onSubmit, loading }) {
  // Camera stream and recording state
  const liveVideoRef     = useRef(null);   // <video> showing the live stream
  const playbackRef      = useRef(null);   // <video> showing the recorded clip
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const streamRef        = useRef(null);

  const [cameraActive, setCameraActive]   = useState(false);
  const [recording, setRecording]         = useState(false);
  const [recordedBlob, setRecordedBlob]   = useState(null);
  const [recordedUrl, setRecordedUrl]     = useState(null);
  const [recordingSec, setRecordingSec]   = useState(0);
  const [cameraError, setCameraError]     = useState('');

  // Check browser support once on mount
  const isSupported =
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined';

  // ── Timer for recording duration ──────────────────────────────────────
  useEffect(() => {
    if (!recording) return;
    setRecordingSec(0);
    const id = setInterval(() => setRecordingSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopStream();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────
  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // ── Open camera ───────────────────────────────────────────────────────
  const handleStartCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions and try again.'
          : `Could not access camera: ${err.message}`
      );
    }
  };

  // ── Close camera ──────────────────────────────────────────────────────
  const handleStopCamera = () => {
    mediaRecorderRef.current?.stop();
    stopStream();
    setCameraActive(false);
    setRecording(false);
  };

  // ── Start recording ───────────────────────────────────────────────────
  const handleStartRecording = useCallback(() => {
    if (!streamRef.current || recording) return;

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
      const url  = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      if (playbackRef.current) playbackRef.current.src = url;
    };

    recorder.start(250); // collect data every 250 ms
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }, [recording]);

  // ── Stop recording ────────────────────────────────────────────────────
  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // ── Discard recording and re-record ───────────────────────────────────
  const handleDiscard = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingSec(0);
  };

  // ── Submit recording to backend ───────────────────────────────────────
  const handleSubmit = async () => {
    if (!recordedBlob || loading) return;
    const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([recordedBlob], `camera_capture.${ext}`, { type: recordedBlob.type });
    await onSubmit(file, () => {}); // no upload progress bar for camera path
  };

  // ── Unsupported browser ───────────────────────────────────────────────
  if (!isSupported) {
    return (
      <div className="camera__unsupported">
        Your browser does not support camera capture (MediaDevices / MediaRecorder API).
        Please use Chrome, Firefox, or Edge, or upload a video file instead.
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Controls: open/close camera ─────────────────────────── */}
      <div className="camera__controls">
        {!cameraActive ? (
          <button className="btn btn--primary" onClick={handleStartCamera} disabled={loading}>
            Start Camera
          </button>
        ) : (
          <button className="btn btn--secondary" onClick={handleStopCamera} disabled={loading}>
            Close Camera
          </button>
        )}

        {cameraActive && !recording && !recordedBlob && (
          <button className="btn btn--primary" onClick={handleStartRecording} disabled={loading}>
            ⏺ Record
          </button>
        )}

        {recording && (
          <button className="btn btn--danger" onClick={handleStopRecording}>
            ⏹ Stop
          </button>
        )}
      </div>

      {/* ── Camera error ─────────────────────────────────────────── */}
      {cameraError && (
        <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          ⚠ {cameraError}
        </p>
      )}

      {/* ── Live preview ─────────────────────────────────────────── */}
      {cameraActive && !recordedBlob && (
        <>
          <p className="camera__preview-label">Live Camera</p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={liveVideoRef}
            className="camera__video"
            autoPlay
            playsInline
            muted
            aria-label="Live camera feed"
          />
          {recording && (
            <div className="camera__status">
              <span className="camera__dot camera__dot--recording" />
              <span>Recording… {recordingSec}s &nbsp;(click Stop when done)</span>
            </div>
          )}
          {!recording && (
            <p className="camera__info">
              Click <strong>⏺ Record</strong> to capture a video clip, then stop when done.
            </p>
          )}
        </>
      )}

      {/* ── Recorded clip preview ────────────────────────────────── */}
      {recordedUrl && (
        <>
          <p className="camera__preview-label">Recorded Clip</p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={playbackRef}
            className="camera__video"
            controls
            aria-label="Recorded video clip"
          />
          <div className="camera__actions">
            <button
              className="btn btn--primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Running inference…' : 'Predict Action'}
            </button>
            <button
              className="btn btn--secondary"
              onClick={handleDiscard}
              disabled={loading}
            >
              Re-record
            </button>
          </div>
        </>
      )}
    </div>
  );
}
