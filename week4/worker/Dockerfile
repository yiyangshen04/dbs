FROM node:20-alpine

WORKDIR /app

# Install prod deps first (cache-friendly).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# App source.
COPY tsconfig.json ./
COPY src ./src

# No HTTP server; Fly.io handles this as a worker (no public port).
ENV NODE_ENV=production
CMD ["npm", "start"]
