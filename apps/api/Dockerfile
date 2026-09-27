FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/database/package.json ./packages/database/package.json

RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY apps/api ./apps/api
COPY packages/database ./packages/database

RUN npx prisma generate --schema ./packages/database/prisma/schema.prisma

WORKDIR /app/apps/api
RUN npm run build

EXPOSE 4000

CMD ["npm", "run", "start"]
