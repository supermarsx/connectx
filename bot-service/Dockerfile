# ── Build stage ──
FROM node:22-slim AS build

WORKDIR /app

# Copy workspace dependency files
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY bot-service/package.json bot-service/

# Install dependencies
RUN npm ci --workspace=bot-service --workspace=shared

# Copy source
COPY shared/ shared/
COPY bot-service/ bot-service/

# Build
RUN npm run build --workspace=bot-service

# ── Runtime stage ──
FROM node:22-slim

WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/shared/ shared/
COPY --from=build /app/bot-service/package.json bot-service/
COPY --from=build /app/bot-service/dist/ bot-service/dist/

RUN npm ci --workspace=bot-service --workspace=shared --omit=dev

ENV NODE_ENV=production
EXPOSE 3002

CMD ["node", "bot-service/dist/index.js"]
