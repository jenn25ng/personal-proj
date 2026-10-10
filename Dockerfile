# 생각 먼저 AI · 단일 서버/컨테이너 배포용
# 빌드: docker build -t think-first .
# 실행: docker run --env-file .env.production -p 3000:3000 think-first
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 빌드 시점에는 DB·키가 필요 없다. 페이지는 요청 시점에 DB를 연다.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
# standalone 출력 + 정적 파일 + 마이그레이션 SQL + 화면에서 읽는 문서
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/drizzle ./drizzle
COPY --from=build --chown=app:app /app/docs ./docs
USER app
EXPOSE 3000
CMD ["node", "server.js"]
