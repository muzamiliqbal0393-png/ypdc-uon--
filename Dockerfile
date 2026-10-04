FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/server/package.json backend/server/package-lock.json* ./backend/server/
RUN cd backend/server && (npm ci --omit=dev || npm install --omit=dev)

COPY backend/server/ ./backend/server/
COPY frontend/ ./frontend/

RUN rm -rf backend/server/data/*.sqlite* backend/server/.env

ENV NODE_ENV=production \
    PORT=8000 \
    HOST=0.0.0.0 \
    DB_FILE=./data/ypdc.sqlite

EXPOSE 8000
VOLUME ["/app/backend/server/data"]

WORKDIR /app/backend/server
CMD ["sh", "-c", "npm run seed && node server.js"]
