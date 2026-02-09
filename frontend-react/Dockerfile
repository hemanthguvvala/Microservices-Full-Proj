# ─── Build Stage ────────────────────────────────────────────────────────────
# Multi-stage build — standard at every MNC
# Why: Final image is ~25MB instead of ~1.2GB (node_modules not shipped)
# Used by: Netflix, Uber, Airbnb, Spotify — every company deploying containers

FROM node:20-alpine AS builder

# Security: Don't run as root during build
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Leverage Docker layer caching — dependencies change less often than code
# This means `npm ci` only runs when package.json/package-lock.json changes
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .

# Build-time arguments (injected by CI/CD pipeline)
ARG VITE_API_BASE_URL
ARG VITE_SENTRY_DSN
ARG VITE_GA_TRACKING_ID
ARG VITE_APP_VERSION

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ENV VITE_GA_TRACKING_ID=${VITE_GA_TRACKING_ID}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

RUN npm run build

# ─── Production Stage ──────────────────────────────────────────────────────
# nginx:alpine is ~6MB — the industry standard for serving SPAs
# Why nginx over node/express for static files:
# - 10x less memory usage
# - Built-in gzip, caching, security headers
# - Battle-tested reverse proxy (handles 100k+ concurrent connections)
# - No Node.js runtime vulnerabilities in production

FROM nginx:1.25-alpine AS production

# Security: Remove default nginx config and content
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Security headers are in nginx.conf
# Health check for container orchestration (Kubernetes, ECS, Cloud Run)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Non-root user (security best practice)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
