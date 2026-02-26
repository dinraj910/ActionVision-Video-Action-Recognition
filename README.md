# ActionVision – Real-Time Video Action Recognition System

> **MobileNetV2 + GRU** · **FastAPI** · **React (Vite)** · **UCF-101 (15 classes)**

A production-ready full-stack application that classifies human actions in short video clips.  
Upload a file or record directly from your webcam; the model returns the action label and confidence score in real time.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [Model](#model)
4. [Local Development](#local-development)
5. [Docker Deployment](#docker-deployment)
6. [Cloud Deployment](#cloud-deployment)
7. [API Reference](#api-reference)
8. [Environment Variables](#environment-variables)
9. [Supported Action Classes](#supported-action-classes)

---

## Architecture

```
Browser (React / Vite)
       │  POST /predict  (multipart video)
       ▼
FastAPI  (Uvicorn / Gunicorn)
  ├── Validate file type & size
  ├── Write to temp file
  ├── OpenCV: extract 16 frames uniformly
  ├── Normalize [0, 1]
  ├── TF model: TimeDistributed(MobileNetV2) → GRU → Dense
  └── Return { action, confidence }
```

- **Backend**: FastAPI + Uvicorn/Gunicorn, single-worker to avoid duplicate model loads.
- **Model**: trained on 15 UCF-101 classes; input shape `(1, 16, 224, 224, 3)`.
- **Frontend**: React 18 (Vite 5), zero framework deps – plain CSS custom properties.
- **Deployment**: Docker Compose (backend + Nginx-served frontend).

---

## Project Structure

```
Action Vision/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app, CORS, /predict, /health
│   │   ├── model_loader.py    # Load .keras model once at startup
│   │   └── predictor.py       # Frame extraction + inference pipeline
│   ├── model/
│   │   ├── final_video_action_model.keras
│   │   └── class_labels.txt
│   ├── Dockerfile
│   ├── gunicorn.conf.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/predict.js
│   │   ├── components/
│   │   │   ├── VideoUploader.jsx / .css
│   │   │   ├── CameraCapture.jsx / .css
│   │   │   ├── PredictionResult.jsx / .css
│   │   │   ├── LoadingSpinner.jsx / .css
│   │   │   └── ErrorMessage.jsx / .css
│   │   ├── App.jsx / App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
└── README.md
```

---

## Model

| Property         | Value                               |
|------------------|-------------------------------------|
| Architecture     | TimeDistributed(MobileNetV2) + GRU  |
| Input shape      | (batch, 16, 224, 224, 3)            |
| Dataset          | UCF-101 (first 15 classes)          |
| Frame sampling   | Uniform segment-based (deterministic)|
| Normalization    | Divide by 255 → [0, 1]              |
| Output           | Softmax over 15 classes             |
| File format      | `.keras` (TF 2.x SavedModel wrapper)|

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 20+
- (Optional) GPU with CUDA for faster inference

### Backend

```bash
cd backend

# 1. Create virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy environment file
cp .env.example .env
# Edit .env and set MODEL_PATH if necessary

# 4. Run development server
uvicorn app.main:app --reload --port 8000
```

Visit: http://localhost:8000/docs (Swagger UI)

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local
# .env.local already points to http://localhost:8000

# 3. Run dev server
npm run dev
```

Visit: http://localhost:3000

---

## Docker Deployment

### Build and run (single command)

```bash
# From the project root
docker-compose up --build
```

| Service  | Host port | URL                        |
|----------|-----------|----------------------------|
| Backend  | 8000      | http://localhost:8000      |
| Frontend | 80        | http://localhost            |

### Rebuild after code changes

```bash
docker-compose up --build --force-recreate
```

### Stop

```bash
docker-compose down
```

---

## Cloud Deployment

### Render

1. Create a **Web Service** → connect your GitHub repo → choose **Docker** runtime.
2. Set root directory to `backend/`.
3. Add environment variables from `.env.example`.
4. Deploy. Render exposes a public URL – set it as `VITE_API_URL` in the frontend service.

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli
railway login

# Deploy backend
cd backend
railway up

# Deploy frontend (set VITE_API_URL to the backend Railway URL)
cd ../frontend
VITE_API_URL=https://your-backend.up.railway.app npm run build
railway up
```

### AWS EC2 / DigitalOcean Droplet

```bash
# 1. SSH into the instance
ssh user@your-server-ip

# 2. Install Docker + Compose
curl -fsSL https://get.docker.com | sh
sudo apt-get install -y docker-compose-plugin

# 3. Clone the repo
git clone https://github.com/yourhandle/actionvision.git
cd actionvision

# 4. Configure environment
cp backend/.env.example backend/.env
nano backend/.env   # set MODEL_PATH, ALLOWED_ORIGINS, etc.

# 5. Start
docker compose up -d --build

# 6. (Optional) set up Nginx as a reverse proxy + SSL with Certbot
```

---

## API Reference

### `GET /health`

```json
{ "status": "ok", "model_loaded": true, "num_classes": 15 }
```

### `POST /predict`

**Request**  
`Content-Type: multipart/form-data`  
Field: `file` — video file (MP4, AVI, MOV, WebM, MKV)

**Response 200**
```json
{
  "action": "CricketShot",
  "confidence": 0.9984
}
```

**Error codes**

| Code | Meaning                                    |
|------|--------------------------------------------|
| 400  | Unsupported file type                      |
| 413  | File exceeds 100 MB limit                  |
| 422  | Video cannot be processed (too short, etc.)|
| 500  | Internal server error                      |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable            | Default                                   | Description                         |
|---------------------|-------------------------------------------|-------------------------------------|
| `MODEL_PATH`        | `model/final_video_action_model.keras`    | Path to the Keras model file        |
| `LABELS_PATH`       | `model/class_labels.txt`                  | Path to class labels (.txt, one/line)|
| `PORT`              | `8000`                                    | Server port                         |
| `MAX_UPLOAD_MB`     | `100`                                     | Max upload size in megabytes        |
| `ALLOWED_ORIGINS`   | `*`                                       | Comma-separated CORS origins        |
| `WEB_CONCURRENCY`   | `1`                                       | Number of Gunicorn workers          |
| `GUNICORN_TIMEOUT`  | `120`                                     | Worker timeout in seconds           |
| `LOG_LEVEL`         | `info`                                    | Logging verbosity                   |

### Frontend (`frontend/.env.local`)

| Variable       | Default                   | Description                        |
|----------------|---------------------------|------------------------------------|
| `VITE_API_URL` | `http://localhost:8000`   | Full URL of the FastAPI backend    |

---

## Supported Action Classes

The model is trained on the **first 15 UCF-101 classes** (sorted alphabetically):

| Index | Class               |
|-------|---------------------|
| 0     | ApplyEyeMakeup      |
| 1     | ApplyLipstick       |
| 2     | Archery             |
| 3     | BabyCrawling        |
| 4     | BalanceBeam         |
| 5     | BandMarching        |
| 6     | BaseballPitch       |
| 7     | Basketball          |
| 8     | BasketballDunk      |
| 9     | BenchPress          |
| 10    | Biking              |
| 11    | Billiards           |
| 12    | BlowDryHair         |
| 13    | BlowingCandles      |
| 14    | BodyWeightSquats    |

To add more classes, retrain with a larger subset and update `class_labels.txt`.

---

## Tech Stack

| Layer      | Technology                            |
|------------|---------------------------------------|
| ML Model   | TensorFlow 2.16, Keras                |
| CV         | OpenCV (headless)                     |
| Backend    | FastAPI, Uvicorn, Gunicorn            |
| Frontend   | React 18, Vite 5, Axios               |
| Serving    | Nginx (frontend), Gunicorn (backend)  |
| Container  | Docker, Docker Compose                |

---

*Built as a portfolio / resume project demonstrating end-to-end MLOps and full-stack engineering.*
