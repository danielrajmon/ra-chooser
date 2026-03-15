# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm --prefix backend ci
RUN npm --prefix frontend ci

COPY backend ./backend
COPY frontend ./frontend

RUN npm --prefix backend run build
RUN npm --prefix frontend run build

FROM node:22-alpine AS runtime
WORKDIR /app

COPY backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/index.html ./frontend/index.html
COPY --from=build /app/frontend/styles.css ./frontend/styles.css
COPY --from=build /app/frontend/dist ./frontend/dist
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh

ENV NODE_ENV=production
ENV BACKEND_PORT=4000
ENV POSTGRES_HOST=__REQUIRED__
ENV POSTGRES_PORT=5432
ENV POSTGRES_DB=__REQUIRED__
ENV POSTGRES_USER=__REQUIRED__
ENV POSTGRES_PASSWORD=__REQUIRED__
EXPOSE 4000

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["node", "backend/dist/server.js"]
