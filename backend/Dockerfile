# ============================================================
# Dockerfile – ActionVision Backend
# ============================================================
# Multi-stage build keeps the final image lean.
# Base: python:3.11-slim (Debian Bookworm)
# ============================================================

# ── Stage 1: dependency builder ───────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install OS-level build deps for OpenCV / numpy wheel compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libglib2.0-0 \
        libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python deps into an isolated prefix so we can
# copy only the installed packages into the final stage.
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: runtime image ────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Minimal runtime OS libs for OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from the builder stage
COPY --from=builder /install /usr/local

# Create a non-root user for security
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

WORKDIR /app

# Copy application source
COPY --chown=appuser:appuser app/ ./app/
COPY --chown=appuser:appuser gunicorn.conf.py .

# Copy the trained model (ensure the file exists on the host before building)
# The model directory is expected at ./model/ relative to this Dockerfile.
COPY --chown=appuser:appuser model/ ./model/

# ── Runtime config ────────────────────────────────────────────────────────
# Disable Python output buffering so logs appear immediately
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

EXPOSE 8000

# ── Health check ──────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" \
    || exit 1

# ── Start command ─────────────────────────────────────────────────────────
# Gunicorn manages workers; each worker runs Uvicorn for async support.
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app.main:app"]
