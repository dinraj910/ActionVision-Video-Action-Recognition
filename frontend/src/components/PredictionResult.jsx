// src/components/PredictionResult.jsx
// Displays the action label and a colour-coded Bootstrap confidence bar.
import './PredictionResult.css';

const CLASS_ICONS = {
  CricketShot:  'bi-dribbble',
  PlayingCello: 'bi-music-note-beamed',
  Punch:        'bi-lightning-charge-fill',
  ShavingBeard: 'bi-scissors',
  TennisSwing:  'bi-award-fill',
};

function confidenceColor(confidence) {
  if (confidence >= 0.75) return 'bg-success';
  if (confidence >= 0.45) return 'bg-warning';
  return 'bg-danger';
}

function confidenceLabel(confidence) {
  if (confidence >= 0.75) return { text: 'High confidence', badge: 'success' };
  if (confidence >= 0.45) return { text: 'Medium confidence', badge: 'warning' };
  return { text: 'Low confidence', badge: 'danger' };
}

export default function PredictionResult({ action, confidence }) {
  if (!action) return null;

  const pct   = Math.round(confidence * 100);
  const icon  = CLASS_ICONS[action] || 'bi-camera-video-fill';
  const color = confidenceColor(confidence);
  const { text: confText, badge: confBadge } = confidenceLabel(confidence);

  return (
    <div className="av-card av-result mt-4" role="region" aria-label="Prediction result">
      <div className="av-card-header">
        <i className="bi bi-check2-circle text-success"></i>
        Prediction Result
        <span className={`badge bg-${confBadge} bg-opacity-15 text-${confBadge} ms-auto border border-${confBadge} border-opacity-25 small fw-normal`}>
          {confText}
        </span>
      </div>

      <div className="p-4">
        {/* Action label */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <div
            className="d-flex align-items-center justify-content-center rounded-3"
            style={{
              width: 56, height: 56,
              background: 'linear-gradient(135deg,#ede9fe,#e0e7ff)',
              flexShrink: 0,
            }}
          >
            <i className={`bi ${icon} fs-4`} style={{ color: '#4f46e5' }}></i>
          </div>
          <div>
            <div className="text-muted small text-uppercase fw-semibold" style={{ letterSpacing: '0.05em' }}>
              Detected Action
            </div>
            <div className="av-result__action">{action}</div>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="av-confidence-bar mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1 small">
            <span className="text-muted fw-medium">Confidence Score</span>
            <span className="fw-bold" style={{ color: '#4f46e5', fontFamily: 'monospace' }}>
              {pct}%
            </span>
          </div>
          <div className="progress" style={{ height: 10, borderRadius: 5 }}>
            <div
              className={`progress-bar ${color}`}
              role="progressbar"
              style={{ width: `${pct}%`, borderRadius: 5 }}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="row g-2">
          <div className="col-4">
            <div className="av-stat">
              <div className="av-stat__label">Raw Score</div>
              <div className="av-stat__value">{confidence.toFixed(4)}</div>
            </div>
          </div>
          <div className="col-4">
            <div className="av-stat">
              <div className="av-stat__label">Percentage</div>
              <div className="av-stat__value">{pct}%</div>
            </div>
          </div>
          <div className="col-4">
            <div className="av-stat">
              <div className="av-stat__label">Model</div>
              <div className="av-stat__value" style={{ fontSize: '0.75rem' }}>MV2+GRU</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

