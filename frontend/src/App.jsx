// src/App.jsx
// -----------------------------------------------------------------------
// Root component – manages global state and top-level layout.
//
// State:
//   activeTab   – 'upload' | 'camera'
//   loading     – true while the API call is in-flight
//   prediction  – { action, confidence } from the backend
//   error       – error string shown to the user
// -----------------------------------------------------------------------

import { useState } from 'react';
import './App.css';

import { predictVideo } from './api/predict';
import VideoUploader    from './components/VideoUploader';
import CameraCapture    from './components/CameraCapture';
import PredictionResult from './components/PredictionResult';
import LoadingSpinner   from './components/LoadingSpinner';
import ErrorMessage     from './components/ErrorMessage';

export default function App() {
  const [activeTab,  setActiveTab]  = useState('upload');
  const [loading,    setLoading]    = useState(false);
  const [prediction, setPrediction] = useState(null);  // { action, confidence }
  const [error,      setError]      = useState('');
  const [spinnerMsg, setSpinnerMsg] = useState('Analysing video…');

  // ── Shared submit handler (used by both Upload and Camera tabs) ────────
  const handleSubmit = async (file, onProgress) => {
    setLoading(true);
    setError('');
    setPrediction(null);
    setSpinnerMsg('Uploading video…');

    try {
      const result = await predictVideo(file, (pct) => {
        onProgress(pct);
        if (pct >= 100) setSpinnerMsg('Running model inference…');
      });
      setPrediction(result);
    } catch (err) {
      // Parse Axios / FastAPI error into a readable message
      const detail =
        err.response?.data?.detail ||
        err.message ||
        'An unexpected error occurred. Please try again.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  // ── Tab switch: clear results ──────────────────────────────────────────
  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPrediction(null);
    setError('');
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="header">
        <span className="header__logo">ActionVision</span>
        <span className="header__tagline">
          Real-Time Video Action Recognition · MobileNetV2 + GRU · UCF-101
        </span>
      </header>

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="main">
        {/* Hero */}
        <section className="hero">
          <h1 className="hero__title">Video Action Recognition</h1>
          <p className="hero__description">
            Upload a short video clip or use your camera to record one.
            The model will identify the human action and report its confidence.
          </p>
          <div className="hero__meta">
            <span className="badge">MobileNetV2 + GRU</span>
            <span className="badge">16 frames uniform sampling</span>
            <span className="badge">UCF-101 · 15 classes</span>
            <span className="badge">FastAPI backend</span>
          </div>
        </section>

        {/* Tab bar */}
        <nav className="tab-bar" aria-label="Input method">
          <button
            className={`tab-btn${activeTab === 'upload' ? ' tab-btn--active' : ''}`}
            onClick={() => switchTab('upload')}
            aria-current={activeTab === 'upload' ? 'page' : undefined}
          >
            Upload Video
          </button>
          <button
            className={`tab-btn${activeTab === 'camera' ? ' tab-btn--active' : ''}`}
            onClick={() => switchTab('camera')}
            aria-current={activeTab === 'camera' ? 'page' : undefined}
          >
            Use Camera
          </button>
        </nav>

        {/* Input panel */}
        <div className="card">
          {activeTab === 'upload' ? (
            <VideoUploader onSubmit={handleSubmit} loading={loading} />
          ) : (
            <CameraCapture onSubmit={handleSubmit} loading={loading} />
          )}
        </div>

        {/* Loading spinner */}
        {loading && <LoadingSpinner label={spinnerMsg} />}

        {/* Error */}
        {!loading && error && <ErrorMessage message={error} />}

        {/* Prediction result */}
        {!loading && !error && prediction && (
          <PredictionResult
            action={prediction.action}
            confidence={prediction.confidence}
          />
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="footer">
        ActionVision · Built with FastAPI + React · MobileNetV2 + GRU
      </footer>
    </div>
  );
}
