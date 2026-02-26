// src/api/predict.js
// ------------------------------------------------------------------
// Thin wrapper around Axios for communicating with the FastAPI backend.
// All API calls in the app go through this module.
// ------------------------------------------------------------------

import axios from 'axios';

// Read the API base URL from the Vite environment.
// Falls back to the dev proxy target if the variable is not set.
const BASE_URL = import.meta.env.VITE_API_URL || '';

// Shared Axios instance with default settings
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000, // 2 minutes – inference on slow machines can take time
});

/**
 * Send a video file to the /predict endpoint.
 *
 * @param {File} videoFile - The video File object from the browser.
 * @param {(progress: number) => void} [onUploadProgress] - Optional upload progress callback (0–100).
 * @returns {Promise<{ action: string, confidence: number }>}
 */
export async function predictVideo(videoFile, onUploadProgress) {
  const formData = new FormData();
  formData.append('file', videoFile);

  const response = await apiClient.post('/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onUploadProgress
      ? (event) => {
          const percent = Math.round((event.loaded * 100) / (event.total ?? 1));
          onUploadProgress(percent);
        }
      : undefined,
  });

  return response.data; // { action, confidence }
}

/**
 * Health-check the backend.
 * @returns {Promise<{ status: string, model_loaded: boolean }>}
 */
export async function checkHealth() {
  const response = await apiClient.get('/health');
  return response.data;
}
