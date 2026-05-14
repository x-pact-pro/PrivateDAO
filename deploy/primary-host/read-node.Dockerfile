FROM node:20-bookworm-slim

WORKDIR /srv/privatedao

ENV TS_NODE_PREFER_TS_EXTS=true

COPY package.json package-lock.json tsconfig.json ./
COPY scripts ./scripts
COPY docs ./docs
COPY deploy/primary-host/target ./target

RUN npm ci --include=dev --ignore-scripts

EXPOSE 8787

CMD ["npm", "run", "start:read-node"]
