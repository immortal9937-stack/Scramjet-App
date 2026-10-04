FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# pnpm version comes from "packageManager" in package.json
RUN corepack enable

# Install dependencies first so this layer is cached between code changes
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY . .

# Cloud Run (and most hosts) set PORT; the app falls back to 8080
EXPOSE 8080
CMD ["node", "src/index.js"]
