FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json

RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY apps/web ./apps/web

WORKDIR /app/apps/web
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=0 /app/apps/web/dist /app/dist
RUN npm install -g serve

EXPOSE 5173
CMD ["serve", "-s", "/app/dist", "-l", "5173"]
