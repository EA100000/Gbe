# syntax=docker/dockerfile:1
# Image de production de l'API Gbè (NestJS, Node 22).
# À construire depuis la racine du dépôt :
#   docker build -f infra/api.Dockerfile -t gbe-api .
# Aucun secret dans l'image : DATABASE_URL, JWT_SECRET… sont fournis au lancement.

# 1. Build. `npm ci` installe tout le monorepo (npm ne sait pas se limiter à un workspace),
#    mais cette étape est jetée : seul le résultat du build passe dans l'image finale.
FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY packages/domain/package.json packages/domain/
COPY packages/content-schema/package.json packages/content-schema/
COPY packages/ui/package.json packages/ui/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/domain packages/domain
COPY apps/api apps/api
# esbuild produit dist/main.js et dist/db/migrate-cli.js, autonomes (tout le JavaScript inclus).
RUN npm run build --workspace apps/api
# Seul module natif (compilé par plateforme) : installé à part, à la version exacte du lockfile.
RUN mkdir /native && cd /native && echo '{"private":true}' > package.json \
  && npm install --no-save --no-audit --no-fund \
     "@node-rs/argon2@$(node -p "require('/repo/package-lock.json').packages['node_modules/@node-rs/argon2'].version")"

# 2. Image finale : Node, le bundle, Argon2 et les migrations SQL (quelques Mo en plus de Node).
FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /native/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY database/migrations ./database/migrations
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "dist/main.js"]
