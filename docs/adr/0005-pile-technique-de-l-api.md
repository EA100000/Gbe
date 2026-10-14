# 0005 — Pile technique de l'API : Drizzle, NestJS 11, PostgreSQL de CI

- **Date** : 2026-10-14
- **Statut** : proposé (à confirmer par le porteur du projet)
- **Écart au cahier technique** : oui (Prisma → Drizzle, Testcontainers → service PostgreSQL, TanStack Query différé)

## Contexte

Le cahier prévoit NestJS + PostgreSQL **via Prisma**, et des tests d'API avec **Testcontainers**.
Pendant la construction du jalon J3 :

- le moteur binaire de Prisma se télécharge depuis `binaries.prisma.sh`, refusé (403) par
  l'environnement de travail utilisé pour écrire ce code ; Prisma ne pouvait donc ni générer
  son client ni être testé ici ;
- Docker n'était pas disponible dans ce même environnement, donc pas de Testcontainers ;
- la version 12 de NestJS publiée sur npm est en modules ESM uniquement, alors que l'outillage
  (Jest, décorateurs) est aujourd'hui calé sur CommonJS.

## Décision

1. **Drizzle ORM** (+ `pg`) à la place de Prisma. Schéma en TypeScript (`apps/api/src/db/schema.ts`),
   migrations SQL lisibles générées par `drizzle-kit` dans `database/migrations/`, appliquées au
   démarrage (`RUN_MIGRATIONS`) ou par `npm run db:migrate`. Pas de moteur binaire.
2. **NestJS 11** (CommonJS). Les dépendances sont injectées explicitement avec `@Inject(...)` :
   le code ne dépend pas des métadonnées de types, ce qui permet de construire avec **esbuild**.
3. **Build en un seul fichier** : esbuild inclut tout le JavaScript dans `dist/main.js` ; seul le
   module natif `@node-rs/argon2` est installé à part dans l'image Docker (à la version exacte du
   lockfile). Raison : `npm ci --workspace` n'isole pas un workspace (npm 10 installe tout le
   monorepo, Expo compris, soit environ 630 Mo).
4. **Tests de l'API** : Jest + Supertest + **@swc/jest** (Babel ne gère pas les décorateurs de
   paramètres), sur une vraie base PostgreSQL désignée par `TEST_DATABASE_URL` : service PostgreSQL
   de GitHub Actions en CI, `docker compose up -d postgres` en local. Sans cette variable, les tests
   sur base sont sautés en local avec un avertissement, et **font échouer la CI**.
5. **TanStack Query différé** : la synchronisation est un envoi en arrière-plan (file d'événements),
   pas une lecture de données serveur à mettre en cache. TanStack Query arrivera avec la première
   lecture serveur (téléchargement des packs en J4, profil en J5).

## Conséquences

- Plus simple : aucun binaire à télécharger, image Docker de quelques Mo au-dessus de Node,
  migrations SQL relisibles par un humain.
- Plus difficile : Drizzle est moins répandu que Prisma (moins de réponses toutes faites).
- Revenir à Prisma reste possible : réécrire `schema.ts` et les requêtes des deux services
  (environ 150 lignes) ; les migrations SQL existantes restent valables.
- Testcontainers pourra remplacer le service PostgreSQL si on veut des tests lancés sans
  préparation locale ; les tests n'ont besoin que d'une URL, ils ne changeraient pas.
- `CLAUDE.md` (section Stack et Tests) doit être mis à jour si cette décision est acceptée.
