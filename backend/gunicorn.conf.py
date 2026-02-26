# ============================================================
# gunicorn.conf.py – Production Gunicorn configuration
# ============================================================
# Used when running:  gunicorn -c gunicorn.conf.py app.main:app
# ============================================================

import multiprocessing
import os

# ── Worker config ──────────────────────────────────────────────────────────
# Uvicorn workers for async FastAPI support.
# Keep workers=1 if the ML model is large (avoids loading it N times).
worker_class = "uvicorn.workers.UvicornWorker"
workers = int(os.getenv("WEB_CONCURRENCY", 1))   # 1 recommended for GPU/large models
threads = 1

# ── Networking ─────────────────────────────────────────────────────────────
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
timeout = int(os.getenv("GUNICORN_TIMEOUT", 120))   # seconds; increase for slow inference
keepalive = 5

# ── Logging ────────────────────────────────────────────────────────────────
loglevel = os.getenv("LOG_LEVEL", "info")
accesslog = "-"   # stdout
errorlog = "-"    # stdout
capture_output = True

# ── Process naming ─────────────────────────────────────────────────────────
proc_name = "actionvision"
