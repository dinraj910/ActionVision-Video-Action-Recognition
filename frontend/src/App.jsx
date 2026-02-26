// src/App.jsx
// -----------------------------------------------------------------------
// Root component – Bootstrap 5 layout with navbar, hero, tabs, and result.
// -----------------------------------------------------------------------

import { useState } from 'react';
import './App.css';

import { predictVideo } from './api/predict';
import VideoUploader    from './components/VideoUploader';
import CameraCapture    from './components/CameraCapture';
import PredictionResult from './components/PredictionResult';
import LoadingSpinner   from './components/LoadingSpinner';
import ErrorMessage     from './components/ErrorMessage';

const CLASSES = [
  'CricketShot',
  'PlayingCello',
  'Punch',
  'ShavingBeard',
  'TennisSwing',
];

const CLASS_ICONS = {
  CricketShot:  'bi-dribbble',
  PlayingCello: 'bi-music-note-beamed',
  Punch:        'bi-lightning-charge-fill',
  ShavingBeard: 'bi-scissors',
  TennisSwing:  'bi-award-fill',
};

export default function App() {
  const [activeTab,  setActiveTab]  = useState('upload');
  const [loading,    setLoading]    = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error,      setError]      = useState('');
  const [spinnerMsg, setSpinnerMsg] = useState('Analysing video…');

  // ── Shared submit handler ──────────────────────────────────────────────
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
      const detail =
        err.response?.data?.detail ||
        err.message ||
        'An unexpected error occurred. Please try again.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPrediction(null);
    setError('');
  };

  return (
    <div className="d-flex flex-column min-vh-100">

      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <nav className="navbar av-navbar sticky-top">
        <div className="container">
          <a className="navbar-brand" href="/">
            <span className="brand-icon">
              <i className="bi bi-camera-video-fill text-white" style={{ fontSize: '0.9rem' }}></i>
            </span>
            ActionVision
          </a>
          <span className="nav-badge ms-2">AI · UCF-101</span>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="av-hero">
        <div className="container">
          <div className="row align-items-center gy-3">
            <div className="col-lg-8">
              <h1 className="av-hero__title">
                Real-Time <span>Action Recognition</span>
              </h1>
              <p className="av-hero__subtitle">
                Upload a short clip or record via webcam. A deep learning model
                built on <strong>MobileNetV2&nbsp;+&nbsp;GRU</strong> will identify
                the human action and report confidence in real-time.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <span className="tech-badge"><i className="bi bi-cpu-fill"></i> MobileNetV2 + GRU</span>
                <span className="tech-badge"><i className="bi bi-film"></i> 16-frame sampling</span>
                <span className="tech-badge"><i className="bi bi-collection-play"></i> UCF-101 · 5 classes</span>
                <span className="tech-badge"><i className="bi bi-lightning"></i> FastAPI backend</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="av-main flex-grow-1">
        <div className="container">
          <div className="row g-4">

            {/* ── Left column: input panel ───────────────────────────── */}
            <div className="col-lg-8">

              {/* Tab nav */}
              <ul className="nav av-tabs mb-3" role="tablist">
                <li className="nav-item">
                  <button
                    className={`nav-link${activeTab === 'upload' ? ' active' : ''}`}
                    onClick={() => switchTab('upload')}
                    role="tab"
                    aria-selected={activeTab === 'upload'}
                  >
                    <i className="bi bi-upload me-2"></i>Upload Video
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link${activeTab === 'camera' ? ' active' : ''}`}
                    onClick={() => switchTab('camera')}
                    role="tab"
                    aria-selected={activeTab === 'camera'}
                  >
                    <i className="bi bi-camera-video me-2"></i>Use Camera
                  </button>
                </li>
              </ul>

              {/* Input card */}
              <div className="av-card">
                <div className="av-card-header">
                  {activeTab === 'upload' ? (
                    <><i className="bi bi-cloud-arrow-up-fill text-primary"></i> Select or Drop a Video File</>
                  ) : (
                    <><i className="bi bi-camera-video-fill text-primary"></i> Record via Webcam</>
                  )}
                </div>
                <div className="p-3">
                  {activeTab === 'upload' ? (
                    <VideoUploader onSubmit={handleSubmit} loading={loading} />
                  ) : (
                    <CameraCapture onSubmit={handleSubmit} loading={loading} />
                  )}
                </div>
              </div>

              {/* Loading / Error / Result */}
              {loading && <LoadingSpinner label={spinnerMsg} />}
              {!loading && error && <ErrorMessage message={error} />}
              {!loading && !error && prediction && (
                <PredictionResult
                  action={prediction.action}
                  confidence={prediction.confidence}
                />
              )}
            </div>

            {/* ── Right column: info panel ───────────────────────────── */}
            <div className="col-lg-4">
              <div className="av-info-card p-3 mb-3">
                <h6 className="fw-semibold text-dark mb-3">
                  <i className="bi bi-list-check text-primary me-2"></i>Detectable Actions
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {CLASSES.map((cls) => (
                    <span key={cls} className="av-class-pill">
                      <i className={`bi ${CLASS_ICONS[cls]}`}></i>
                      {cls}
                    </span>
                  ))}
                </div>
              </div>

              <div className="av-info-card p-3 mb-3">
                <h6 className="fw-semibold text-dark mb-3">
                  <i className="bi bi-info-circle text-primary me-2"></i>How it Works
                </h6>
                <ol className="ps-3 mb-0 small text-muted lh-lg">
                  <li>Upload a video clip (&lt;&nbsp;100&nbsp;MB)</li>
                  <li>16 frames sampled uniformly</li>
                  <li>Each frame resized to 224×224</li>
                  <li>MobileNetV2 extracts spatial features</li>
                  <li>GRU captures temporal patterns</li>
                  <li>Softmax outputs class probability</li>
                </ol>
              </div>

              <div className="av-info-card p-3">
                <h6 className="fw-semibold text-dark mb-3">
                  <i className="bi bi-bar-chart-fill text-primary me-2"></i>Model Details
                </h6>
                <table className="table table-sm table-borderless mb-0 small">
                  <tbody>
                    <tr><td className="text-muted">Backbone</td><td className="fw-medium">MobileNetV2</td></tr>
                    <tr><td className="text-muted">Temporal</td><td className="fw-medium">GRU</td></tr>
                    <tr><td className="text-muted">Input frames</td><td className="fw-medium">16</td></tr>
                    <tr><td className="text-muted">Resolution</td><td className="fw-medium">224 × 224</td></tr>
                    <tr><td className="text-muted">Dataset</td><td className="fw-medium">UCF-101</td></tr>
                    <tr><td className="text-muted">Classes</td><td className="fw-medium">5</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>{/* /row */}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="av-footer text-center">
        <div className="container">
          <span>ActionVision &nbsp;·&nbsp; MobileNetV2 + GRU &nbsp;·&nbsp; FastAPI + React + Bootstrap 5</span>
        </div>
      </footer>

    </div>
  );
}

