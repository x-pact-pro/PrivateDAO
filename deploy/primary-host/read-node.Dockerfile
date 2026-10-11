FROM node:22-bookworm-slim

WORKDIR /srv/privatedao

ENV TS_NODE_PREFER_TS_EXTS=true
ENV TS_NODE_TRANSPILE_ONLY=true
ENV TS_NODE_EXPERIMENTAL_RESOLVER=true
ENV TS_NODE_PROJECT=/srv/privatedao/tsconfig.runtime.json
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV CYPRESS_INSTALL_BINARY=0

COPY package.json package-lock.json tsconfig.json ./
COPY tsconfig.runtime.json ./tsconfig.runtime.json
COPY scripts ./scripts
COPY packages/privatedao-runtime/src ./packages/privatedao-runtime/src
COPY apps/web/src/lib ./apps/web/src/lib
COPY docs ./docs
COPY migrations ./migrations
COPY zk ./zk
COPY idl ./idl

RUN npm ci --include=dev --omit=optional --ignore-scripts --no-audit --no-fund \
  && npm cache clean --force

EXPOSE 8787

CMD ["npm", "run", "start:read-node"]
