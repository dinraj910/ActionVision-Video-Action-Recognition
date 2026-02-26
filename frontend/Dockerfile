# =============================================================
# Dockerfile – ActionVision Frontend (Nginx + static build)
# =============================================================
# Stage 1: build the React app with Vite
# Stage 2: serve the dist/ folder with Nginx
# =============================================================

# ── Stage 1: Node build ───────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# Copy source and build
COPY . .

# VITE_API_URL can be injected at build time via --build-arg
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build   # outputs to /app/dist


# ── Stage 2: Nginx runtime ────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Remove default site config
RUN rm /etc/nginx/conf.d/default.conf

# Custom Nginx config (SPA-aware + API proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
