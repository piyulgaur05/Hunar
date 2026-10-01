FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.json turbo.json ./
RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
ARG APP
RUN if [ "$APP" != "api" ]; then pnpm --filter @mitti/$APP build; else pnpm --filter @mitti/api build; fi
ENV APP=$APP
ENV NODE_ENV=production
USER node
EXPOSE 3000 3001 4000
CMD ["sh", "-c", "pnpm --filter @mitti/$APP start"]
