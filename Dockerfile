FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev --ignore-scripts

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl --proto '=https' --tlsv1.2 -fsSL https://github.com/Infisical/cli/releases/download/v0.44.9/cli_0.44.9_linux_amd64.tar.gz -o /tmp/infisical.tar.gz \
    && echo "4005a430258df60401ae5288ab0412371f2e56f224ed461758dd2ec83887d556  /tmp/infisical.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/infisical.tar.gz -C /usr/local/bin infisical \
    && rm /tmp/infisical.tar.gz \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8083
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
USER node
EXPOSE 8083
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/server.js"]
