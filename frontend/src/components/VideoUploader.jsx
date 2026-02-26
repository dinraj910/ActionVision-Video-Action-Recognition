// src/components/VideoUploader.jsx
// Handles video file selection via drag-and-drop or file dialog.
// Fully styled with Bootstrap 5 + custom av-* classes.

import { useRef, useState, useCallback } from 'react';
// CSS file kept but now minimal – real styling via Bootstrap + App.css
import './VideoUploader.css';

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

const ACCEPTED_TYPES = [
  'video/mp4',
  'video/avi',
  'video/x-msvideo',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
];

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export default function VideoUploader({ onSubmit, loading }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [dragActive,   setDragActive]   = useState(false);
  const [fileError,    setFileError]    = useState('');
  const [uploadPct,    setUploadPct]    = useState(0);

  const applyFile = useCallback((file) => {
    setFileError('');
    setUploadPct(0);

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|avi|mov|webm|mkv)$/i)) {
      setFileError('Unsupported file type. Please upload MP4, AVI, MOV, WebM, or MKV.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`File too large (${formatBytes(file.size)}). Maximum: 100 MB.`);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, [previewUrl]);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    e.target.value = '';
  };

  const handleDragOver  = (e) => { e.preventDefault(); setDragActive(true);  };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const handleDrop      = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError('');
    setUploadPct(0);
  };

  const handleSubmit = async () => {
    if (!selectedFile || loading) return;
    setUploadPct(0);
    await onSubmit(selectedFile, setUploadPct);
  };

  return (
    <div>
      {/* ── Drop zone ───────────────────────────────────────────────── */}
      {!selectedFile && (
        <div
          className={`av-dropzone${dragActive ? ' av-dropzone--active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Click or drag to upload a video file"
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <div className="av-dropzone__icon">
            <i className="bi bi-cloud-arrow-up-fill"></i>
          </div>
          <p className="av-dropzone__title mb-1">
            <strong>Click to browse</strong> or drag &amp; drop your video here
          </p>
          <p className="av-dropzone__hint mb-0">MP4 · AVI · MOV · WebM · MKV — max 100 MB</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="d-none"
        onChange={handleInputChange}
        tabIndex={-1}
      />

      {/* Client-side validation error */}
      {fileError && (
        <div className="alert alert-warning d-flex align-items-center gap-2 mt-2 py-2 px-3 small">
          <i className="bi bi-exclamation-triangle-fill"></i>
          {fileError}
        </div>
      )}

      {/* Video preview */}
      {previewUrl && (
        <div className="mt-2">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            className="av-video-preview mb-2"
            src={previewUrl}
            controls
            aria-label="Selected video preview"
          />
          <div className="d-flex justify-content-between align-items-center text-muted small px-1">
            <span><i className="bi bi-file-earmark-play me-1"></i>{selectedFile.name}</span>
            <span className="badge bg-secondary bg-opacity-25 text-dark">{formatBytes(selectedFile.size)}</span>
          </div>
        </div>
      )}

      {/* Upload progress bar */}
      {loading && uploadPct > 0 && uploadPct < 100 && (
        <div className="mt-3">
          <div className="d-flex justify-content-between small text-muted mb-1">
            <span>Uploading…</span>
            <span>{uploadPct}%</span>
          </div>
          <div className="av-progress">
            <div className="av-progress-bar" style={{ width: `${uploadPct}%` }}></div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {selectedFile && (
        <div className="d-flex gap-2 mt-3">
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
            onClick={handleClear}
            disabled={loading}
          >
            <i className="bi bi-trash me-1"></i>Clear
          </button>
        </div>
      )}
    </div>
  );
}
