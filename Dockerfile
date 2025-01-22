# Build stage
FROM node:18-slim AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine3.19
RUN apk --no-cache add ca-certificates
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev --omit=optional

USER node
EXPOSE 8000
CMD ["node", "dist/index.js"]