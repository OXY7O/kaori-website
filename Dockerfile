# syntax=docker/dockerfile:1.7
FROM node:22.23.2-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY astro.config.mjs tsconfig.json .prettierrc.json ./
COPY public ./public
COPY src ./src
# Publish the same exact RC/build identity that populates the runtime OCI version label.
# Static Astro content is immutable; stable promotion reuses the accepted RC digest.
ARG APP_VERSION=0.1.0-dev
ARG APP_BUILD_SHA
ENV PUBLIC_KAORI_WEBSITE_VERSION=${APP_VERSION} \
    PUBLIC_KAORI_WEBSITE_BUILD_SHA=${APP_BUILD_SHA}
RUN npm run check && npm run build && test -s dist/index.html

# Digest-pinned NGINX 1.31.9 on Alpine 3.24; Trivy remains authoritative.
FROM ghcr.io/nginx/nginx-unprivileged:1.31.9-alpine3.24-slim@sha256:75e85a09b0f25bd46d49a9fd85589ffa70b0459c8ed5ee0dc6596fd642e1f829 AS production
ARG APP_BUILD_SHA
ARG APP_VERSION=0.1.0-dev
ARG APP_BUILD_DATE
ARG OCI_SOURCE=https://github.com/OXY7O/kaori-website
LABEL org.opencontainers.image.source="${OCI_SOURCE}" \
      org.opencontainers.image.title="KAORI Website" \
      org.opencontainers.image.description="Static KAORI infrastructure operations product website" \
      org.opencontainers.image.revision="${APP_BUILD_SHA}" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${APP_BUILD_DATE}"
COPY --from=build /build/dist/ /usr/share/nginx/html/
COPY deploy/server/nginx.conf /etc/nginx/conf.d/default.conf
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
