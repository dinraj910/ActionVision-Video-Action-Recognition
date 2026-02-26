// src/components/LoadingSpinner.jsx
// Displays a CSS-only spinner with an optional status message.
import './LoadingSpinner.css';

/**
 * @param {{ label?: string }} props
 */
export default function LoadingSpinner({ label = 'Analysing video…' }) {
  return (
    <div className="spinner-overlay" role="status" aria-label={label}>
      <div className="spinner" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
