# Gbè — application d'apprentissage du fongbè

Instructions permanentes pour Claude Code sur ce dépôt. Elles résument le cahier technique du projet ;
en cas de doute, le cahier fait foi et toute décision qui s'en écarte est consignée dans `docs/adr/`.

- Cahier technique : https://claude.ai/code/artifact/a887ed69-e989-4ed1-accf-3a33e8fe79fd
- Maquette (9 écrans, mascotte Galet, personnages Grosse tête) : https://claude.ai/code/artifact/7c03dc5c-8b0e-4a1c-93f6-637ba14d7048

## Produit

- Appli pour francophones qui apprennent le fon : Android d'abord, puis iOS et web, une seule base de code.
- L'audio enregistré par deux locuteurs natifs est le cœur du produit. Le fon est une langue à tons.
- L'appli fonctionne hors-ligne : les leçons arrivent en « packs » (JSON + audio) téléchargés par unité.
- Suivre la maquette écran par écran. Ne pas inventer d'écran, de texte ou de mot fon.

## Stack

- `apps/mobile` : React Native + Expo, Expo Router, TypeScript strict. SQLite (expo-sqlite) pour le local,
  TanStack Query pour les lectures serveur (dès J4, voir `docs/adr/0005`), Zustand pour l'état d'écran,
  expo-audio pour l'audio.
- `apps/api` : NestJS 11 (TypeScript) + PostgreSQL via Drizzle (Prisma prévu au cahier : voir
  `docs/adr/0005`). Comptes invités gérés par l'API (JWT, Argon2, `docs/adr/0006`).
  Pas de Supabase ni de Firebase.
- `apps/backoffice` : outil web des linguistes, branché sur l'API.
- `packages/domain` : règles pures (correction, XP, série, vies, normalisation du fon). Aucun import React.
- `packages/content-schema` : schémas Zod partagés (exercices, packs).
- `packages/ui` : design system (couleurs, typographies, composants, mascotte Galet).
- `database/` : migrations SQL (générées par drizzle-kit depuis `apps/api/src/db/schema.ts`).
  `infra/` : Dockerfiles. `content/` : sources des leçons.
- Fichiers audio et packs : stockage compatible S3 + CDN, fichiers immuables et versionnés.

## Règles de code (non négociables)

- TypeScript `strict` et `noUncheckedIndexedAccess`. Interdits : `any`, `@ts-ignore` sans justification,
  `console.log` en production.
- ESLint + Prettier doivent passer avant chaque commit.
- Toute donnée externe (pack, réponse d'API, stockage local) est validée par un schéma Zod.
- Les composants d'écran affichent et délèguent : aucune règle métier dedans.
- Dossiers par fonctionnalité (`lesson`, `path`, `story`, `sounds`), pas par type de fichier.
- Toutes les chaînes d'interface dans les fichiers de traduction (français d'abord).

## Texte en fon

- Normaliser tout texte fon en Unicode NFC à la saisie, au stockage et avant toute comparaison.
- Aucun mot fon écrit en dur dans le code : tout vient des packs validés par les experts.
- Polices : Andika ou Noto Sans (ɖ, ɛ, ɔ et tons combinés). Sur le web : `lang="fon"`.
- La recherche peut ignorer les tons ; la correction et l'affichage, jamais.

## Hors-ligne, audio, accessibilité

- Le téléphone fait foi pendant la leçon ; le serveur reçoit des événements à identifiant unique,
  rejouables sans doublon.
- Un pack n'est utilisé qu'après vérification de son empreinte.
- Audios d'une leçon préchargés ; un seul lecteur actif ; pause sur appel ou arrière-plan ;
  sur le web, aucune lecture sans geste de l'utilisateur.
- Zones tactiles ≥ 44 pt (iOS) / 48 dp (Android), contraste ≥ 4,5:1, libellé sur chaque bouton icône,
  jamais la couleur seule pour juste/faux.

## Tests

- Jest pour `packages/domain` (≥ 90 % de couverture), React Native Testing Library pour les écrans,
  Jest + Supertest sur une vraie base PostgreSQL (`TEST_DATABASE_URL`) pour l'API,
  Maestro (mobile) et Playwright (web) pour le parcours complet.
- Un test = un comportement, nom en phrase claire, structure Préparer / Agir / Vérifier.
- Ni réseau, ni horloge réelle dans les tests unitaires : dates injectées.
- Un bug corrigé commence par un test qui le reproduit.
- Écrire ou mettre à jour les tests dans le même changement que le code.

## Git

- Branches courtes `type/sujet` (ex. `feat/match-pairs`), Conventional Commits.
- Petites demandes de fusion (idéalement < 400 lignes), CI verte obligatoire.
- Ne jamais committer de secret : variables d'environnement et `.env` hors du dépôt.

## Méthode de travail attendue

- Avant un changement important : proposer un plan court et attendre validation.
- Travailler par petites étapes vérifiables ; lancer lint, typecheck et tests avant de dire « terminé ».
- Signaler tout écart avec la maquette ou le cahier plutôt que de l'improviser.

## Commandes

Node 22 et npm (workspaces). Toutes les commandes se lancent depuis la racine, sauf mention contraire.

```bash
npm install                      # installe tout le monorepo
npm run check                    # format + lint + types + tests + validation des packs (comme la CI)
npm run lint                     # ESLint sur tout le dépôt
npm run typecheck                # TypeScript strict, tous les paquets
npm test                         # Jest : domain, content-schema, appli mobile, API
npm run test:coverage            # idem avec couverture (domain ≥ 90 %)
npm run content:validate         # contrôle bloquant des packs (schéma, NFC, audios, empreintes)
npm run content:build            # réécrit les manifestes et la liste des packs embarqués
npm run audio:placeholders       # bips de remplacement pour les audios manquants (ffmpeg)
npm run packs:publish            # dist-packs/ : packs validés (+ --allow-unvalidated pour la bêta)
npm run packs:serve              # sert dist-packs/ en local (port 8090)
npm run packs:upload             # envoie dist-packs/ sur le stockage S3 (variables S3_*)
npm run e2e:web                  # parcours complets Playwright sur l'export web de l'appli

npm run api:dev                  # API en local (lit le .env racine ; base : docker compose up -d postgres)
npm run api:build                # API en un fichier : apps/api/dist/main.js
npm run db:migrate               # applique les migrations SQL (database/migrations)
npm run db:generate -w apps/api  # nouvelle migration après modification de apps/api/src/db/schema.ts
docker compose up -d --build     # PostgreSQL + MinIO + API (image infra/api.Dockerfile)

cd apps/mobile && npx expo start                         # lancer l'appli (Expo)
cd apps/mobile && npx expo export --platform android     # vérifier le bundle Android
```

Tests de l'API : exporter `TEST_DATABASE_URL` (base jetable, vidée à chaque test). Sans elle, les tests
sur base sont sautés en local et la CI échoue. Synchronisation de l'appli : `EXPO_PUBLIC_API_URL` dans
`apps/mobile/.env` (vide = appli 100 % hors-ligne). Mise à jour des packs : `EXPO_PUBLIC_PACKS_URL`
(vide = pack embarqué seulement). Une version publiée ne change jamais : augmenter `version` (ADR 0007).

Après toute modification d'un `pack.json` : `npm run content:build`, puis `npm run content:validate`.
Les modules natifs utilisés (SQLite, audio, SVG) font partie d'Expo Go : on peut tester avec Expo Go
si sa version correspond au SDK 57, sinon avec un APK de test (`eas build --profile preview --platform android`).
