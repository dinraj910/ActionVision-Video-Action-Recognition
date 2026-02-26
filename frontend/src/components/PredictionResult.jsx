// src/components/PredictionResult.jsx
// Displays the action label and a colour-coded confidence bar.
import './PredictionResult.css';

/**
 * Determine bar colour class based on confidence level.
 * @param {number} confidence
 * @returns {string}
 */
function confidenceClass(confidence) {
  if (confidence >= 0.75) return 'result__bar-fill--high';
  if (confidence >= 0.45) return 'result__bar-fill--medium';
  return 'result__bar-fill--low';
}

/**
 * @param {{ action: string, confidence: number }} props
 */
export default function PredictionResult({ action, confidence }) {
  if (!action) return null;

  const pct = Math.round(confidence * 100);
  const barClass = `result__bar-fill ${confidenceClass(confidence)}`;

  return (
    <div className="result" role="region" aria-label="Prediction result">
      <div className="result__header">
        <span className="result__label">Detected Action</span>
      </div>

      {/* Action label */}
      <p className="result__action">{action}</p>

      <div className="result__divider" />

      {/* Confidence bar */}
      <div className="result__bar-row">
        <div className="result__bar-track" aria-hidden="true">
          <div
            className={barClass}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="result__confidence-text">{pct}%</span>
      </div>

      {/* Screen-reader accessible confidence */}
      <p className="result__meta" style={{ marginTop: '0.5rem' }}>
        Confidence: {confidence.toFixed(4)} &nbsp;|&nbsp; Model: MobileNetV2 + GRU
      </p>
    </div>
  );
}
