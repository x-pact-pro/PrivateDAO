FROM node:22-bookworm-slim

WORKDIR /srv/privatedao

ENV TS_NODE_PREFER_TS_EXTS=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV CYPRESS_INSTALL_BINARY=0

COPY package.json package-lock.json tsconfig.json ./
COPY scripts ./scripts
COPY docs ./docs
COPY deploy/primary-host/target ./target

RUN npm ci --include=dev --omit=optional --ignore-scripts --no-audit --no-fund \
  && npm cache clean --force

EXPOSE 8787

CMD ["npm", "run", "start:read-node"]
