// src/components/ErrorMessage.jsx
// Renders a styled error box for API and validation errors.
import './ErrorMessage.css';

/**
 * @param {{ message: string }} props
 */
export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div className="error-box" role="alert">
      <span className="error-box__icon" aria-hidden="true">⚠</span>
      <p className="error-box__text">{message}</p>
    </div>
  );
}
