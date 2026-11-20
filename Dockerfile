FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG EXPO_PUBLIC_APP_ENV=integration
ARG EXPO_PUBLIC_API_URL=https://tallerconnect-frontend.inf.uct.cl/api
ARG EXPO_PUBLIC_USE_MOCK_AUTH=false
ARG EXPO_PUBLIC_USE_MOCK_SERVICES=false

ENV EXPO_PUBLIC_APP_ENV=${EXPO_PUBLIC_APP_ENV}
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV EXPO_PUBLIC_USE_MOCK_AUTH=${EXPO_PUBLIC_USE_MOCK_AUTH}
ENV EXPO_PUBLIC_USE_MOCK_SERVICES=${EXPO_PUBLIC_USE_MOCK_SERVICES}

RUN npx expo export --platform web \
    && test -f dist/index.html

FROM nginx/nginx-unprivileged:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 8080
