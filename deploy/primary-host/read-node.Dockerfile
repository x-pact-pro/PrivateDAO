FROM node:20-bookworm-slim

WORKDIR /srv/privatedao

COPY package.json package-lock.json tsconfig.json ./
COPY scripts ./scripts
COPY docs ./docs
COPY services/qvac-runtime ./services/qvac-runtime
COPY deploy/primary-host/target ./target

RUN npm ci --include=dev --ignore-scripts

EXPOSE 8787

CMD ["npm", "run", "start:read-node"]
