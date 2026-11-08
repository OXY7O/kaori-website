FROM node:26.13.0-bookworm-slim

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl ca-certificates bash sudo \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global npm@10.9.9 \
    && mkdir -p /workspace/kaori-website \
    && chown -R node:node /workspace \
    && echo 'node ALL=(root) NOPASSWD:ALL' > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

WORKDIR /workspace/kaori-website
USER node
CMD ["sleep", "infinity"]
