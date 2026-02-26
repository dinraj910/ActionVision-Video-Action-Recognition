// src/components/VideoUploader.jsx
// -----------------------------------------------------------------------
// Handles video file selection via drag-and-drop or file dialog.
// Shows a native <video> preview and an upload progress indicator.
// -----------------------------------------------------------------------

import { useRef, useState, useCallback } from 'react';
import './VideoUploader.css';

// Max file size enforced on the client before making the API call (100 MB)
const MAX_FILE_BYTES = 100 * 1024 * 1024;

const ACCEPTED_TYPES = [
  'video/mp4',
  'video/avi',
  'video/x-msvideo',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
];

/**
 * Format bytes as a human-readable string.
 * @param {number} bytes
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

/**
 * @param {{
 *   onSubmit: (file: File, onProgress: (n: number) => void) => Promise<void>,
 *   loading: boolean,
 * }} props
 */
export default function VideoUploader({ onSubmit, loading }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl]     = useState(null);
  const [dragActive, setDragActive]     = useState(false);
  const [fileError, setFileError]       = useState('');
  const [uploadPct, setUploadPct]       = useState(0);

  // ── File validation & state update ─────────────────────────────────────
  const applyFile = useCallback((file) => {
    setFileError('');
    setUploadPct(0);

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|avi|mov|webm|mkv)$/i)) {
      setFileError('Unsupported file type. Please upload MP4, AVI, MOV, WebM, or MKV.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`File is too large (${formatBytes(file.size)}). Maximum allowed: 100 MB.`);
      return;
    }

    // Revoke any previous object URL to avoid memory leaks
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, [previewUrl]);

  // ── Input change ────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    // Reset input so the same file can be re-selected after clearing
    e.target.value = '';
  };

  // ── Drag-and-drop handlers ──────────────────────────────────────────────
  const handleDragOver  = (e) => { e.preventDefault(); setDragActive(true);  };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const handleDrop      = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };

  // ── Clear selection ─────────────────────────────────────────────────────
  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError('');
    setUploadPct(0);
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedFile || loading) return;
    setUploadPct(0);
    await onSubmit(selectedFile, setUploadPct);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Drop zone – clicking it triggers the hidden file input */}
      {!selectedFile && (
        <div
          className={`uploader__dropzone${dragActive ? ' uploader__dropzone--active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Click or drag to upload a video file"
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <div className="uploader__icon" aria-hidden="true">📁</div>
          <p className="uploader__prompt">
            <strong>Click to browse</strong> or drag &amp; drop your video here
          </p>
          <p className="uploader__hint">MP4 · AVI · MOV · WebM · MKV — max 100 MB</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="uploader__input"
        onChange={handleInputChange}
        tabIndex={-1}
      />

      {/* Client-side validation error */}
      {fileError && (
        <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          ⚠ {fileError}
        </p>
      )}

      {/* Video preview */}
      {previewUrl && (
        <div className="uploader__preview">
          <p className="uploader__preview-label">Preview</p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            className="uploader__video"
            src={previewUrl}
            controls
            aria-label="Selected video preview"
          />
          <div className="uploader__file-info">
            <span>{selectedFile.name}</span>
            <span>{formatBytes(selectedFile.size)}</span>
          </div>
        </div>
      )}

      {/* Upload progress bar */}
      {loading && uploadPct > 0 && uploadPct < 100 && (
        <div className="uploader__progress">
          <div className="uploader__progress-track">
            <div className="uploader__progress-fill" style={{ width: `${uploadPct}%` }} />
          </div>
          <p className="uploader__progress-text">Uploading… {uploadPct}%</p>
        </div>
      )}

      {/* Action buttons */}
      {selectedFile && (
        <div className="uploader__actions">
          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Running inference…' : 'Predict Action'}
          </button>
          <button
            className="btn btn--secondary"
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
