FROM node:24.15-alpine

WORKDIR /app
RUN npm install -g pnpm@12.17.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY proto ./proto
COPY src ./src
RUN pnpm run build
