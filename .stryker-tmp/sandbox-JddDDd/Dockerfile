# Aegis Vault Reproducible Build Environment
# Phase 3 / Adim 3.2

FROM node:18.18.0-bullseye-slim

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    libpnpm-java \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies deterministically
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build:electron

# Output hashes for reproducibility verification
RUN sha256sum release/* > build-hashes.sha256
