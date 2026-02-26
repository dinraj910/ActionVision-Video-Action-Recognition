// src/components/ErrorMessage.jsx
// Bootstrap 5 alert for API and validation errors.
import './ErrorMessage.css';

export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div
      className="alert alert-danger d-flex align-items-start gap-3 mt-4"
      role="alert"
      style={{ borderRadius: 10, borderLeft: '4px solid #dc3545' }}
    >
      <i className="bi bi-exclamation-octagon-fill fs-5 flex-shrink-0 mt-1"></i>
      <div>
        <div className="fw-semibold mb-1">Something went wrong</div>
        <div className="small">{message}</div>
      </div>
    </div>
  );
}

