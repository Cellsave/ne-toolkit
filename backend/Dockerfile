FROM node:18-slim

LABEL maintainer="Network Engineers Toolkit"
LABEL version="1.0.0"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini curl ca-certificates tzdata build-essential python3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nettools

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy app files
COPY src ./src

# Create directories
RUN mkdir -p logs uploads && chown -R nettools:nodejs logs uploads

# Switch to non-root user
USER nettools

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini
ENTRYPOINT ["/sbin/tini", "--"]

# Start app
CMD ["node", "src/server.js"]
