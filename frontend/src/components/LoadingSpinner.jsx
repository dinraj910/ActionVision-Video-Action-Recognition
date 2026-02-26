// src/components/LoadingSpinner.jsx
// Bootstrap 5 spinner with status label.
import './LoadingSpinner.css';

export default function LoadingSpinner({ label = 'Analysing video…' }) {
  return (
    <div
      className="d-flex align-items-center gap-3 p-4 mt-4 av-card"
      role="status"
      aria-label={label}
    >
      <div
        className="spinner-border flex-shrink-0"
        style={{ color: '#4f46e5', width: '2rem', height: '2rem' }}
      >
        <span className="visually-hidden">Loading…</span>
      </div>
      <div>
        <div className="fw-semibold text-dark" style={{ fontSize: '0.95rem' }}>{label}</div>
        <div className="text-muted small">This may take a few seconds…</div>
      </div>
    </div>
  );
}

