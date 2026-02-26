// src/components/CameraCapture.jsx
// Live camera recording via MediaDevices API — Bootstrap 5 UI.

import { useRef, useState, useEffect, useCallback } from 'react';
import './CameraCapture.css';

const PREFERRED_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];

function getSupportedMimeType() {
  return PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export default function CameraCapture({ onSubmit, loading }) {
  const liveVideoRef     = useRef(null);
  const playbackRef      = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const streamRef        = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [recording,    setRecording]    = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl,  setRecordedUrl]  = useState(null);
  const [recordingSec, setRecordingSec] = useState(0);
  const [cameraError,  setCameraError]  = useState('');

  const isSupported =
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined';

  useEffect(() => {
    if (!recording) return;
    setRecordingSec(0);
    const id = setInterval(() => setRecordingSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    return () => {
      stopStream();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleStartCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions and try again.'
          : `Could not access camera: ${err.message}`
      );
    }
  };

  const handleStopCamera = () => {
    mediaRecorderRef.current?.stop();
    stopStream();
    setCameraActive(false);
    setRecording(false);
  };

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

    recorder.start(250);
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }, [recording]);

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleDiscard = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingSec(0);
  };

  const handleSubmit = async () => {
    if (!recordedBlob || loading) return;
    const ext  = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([recordedBlob], `camera_capture.${ext}`, { type: recordedBlob.type });
    await onSubmit(file, () => {});
  };

  if (!isSupported) {
    return (
      <div className="alert alert-warning d-flex align-items-center gap-2">
        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
        <span>
          Your browser does not support camera capture (MediaDevices / MediaRecorder API).
          Please use Chrome, Firefox, or Edge, or upload a video file instead.
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* ── Control buttons ─────────────────────────────────────── */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {!cameraActive ? (
          <button
            className="btn btn-outline-primary"
            onClick={handleStartCamera}
            disabled={loading}
          >
            <i className="bi bi-camera-video me-2"></i>Start Camera
          </button>
        ) : (
          <button
            className="btn btn-outline-secondary"
            onClick={handleStopCamera}
            disabled={loading}
          >
            <i className="bi bi-camera-video-off me-2"></i>Close Camera
          </button>
        )}

        {cameraActive && !recording && !recordedBlob && (
          <button
            className="btn btn-danger"
            onClick={handleStartRecording}
            disabled={loading}
          >
            <i className="bi bi-record-circle me-2"></i>Record
          </button>
        )}

        {recording && (
          <button className="btn btn-dark" onClick={handleStopRecording}>
            <i className="bi bi-stop-circle me-2"></i>Stop
          </button>
        )}
      </div>

      {/* ── Camera error ─────────────────────────────────────────── */}
      {cameraError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 small">
          <i className="bi bi-exclamation-octagon-fill"></i>
          {cameraError}
        </div>
      )}

      {/* ── Live preview ─────────────────────────────────────────── */}
      {cameraActive && !recordedBlob && (
        <div>
          <div className="d-flex align-items-center gap-2 mb-2 small text-muted">
            {recording ? (
              <>
                <span className="av-rec-dot"></span>
                <span className="fw-semibold text-danger">Recording&hellip; {recordingSec}s</span>
                <span>— click <strong>Stop</strong> when done</span>
              </>
            ) : (
              <>
                <i className="bi bi-camera-video text-success"></i>
                <span>Live camera — click <strong>Record</strong> to capture</span>
              </>
            )}
          </div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={liveVideoRef}
            className="av-video-preview"
            autoPlay
            playsInline
            muted
            aria-label="Live camera feed"
          />
        </div>
      )}

      {/* ── Recorded clip preview ────────────────────────────────── */}
      {recordedUrl && (
        <div>
          <p className="small text-muted mb-2">
            <i className="bi bi-check-circle-fill text-success me-1"></i>
            Clip recorded ({recordingSec}s) — preview below
          </p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={playbackRef}
            className="av-video-preview mb-3"
            controls
            aria-label="Recorded video clip"
          />
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary px-4"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none' }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Running…</>
                : <><i className="bi bi-lightning-charge-fill me-2"></i>Predict Action</>
              }
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={handleDiscard}
              disabled={loading}
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i>Re-record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
