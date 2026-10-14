# Gbè — apprendre le fongbè

Application pour francophones qui apprennent le fon. Android d'abord, puis iOS et web, une seule base de code.
L'audio enregistré par deux locuteurs natifs est le cœur du produit ; tout fonctionne hors-ligne.

> **État : prêt techniquement pour une bêta fermée.** Les écrans 1 à 9 de la maquette, plus le
> Profil, la suppression du compte, le code de récupération, le rappel quotidien, la fin des vies,
> la sortie d'une leçon, l'unité verrouillée et l'écran d'erreur (écrans 11 à 19),
> fonctionnent avec un pack de test de l'unité 1. Hors-ligne d'abord ; avec une API, la progression
> est sauvegardée (compte invité, sans donnée personnelle) et se retrouve sur un autre téléphone,
> les packs se mettent à jour seuls et la Ligue de la semaine s'affiche.
> **Le contenu fon n'est pas encore validé par les experts** et les audios sont des bips provisoires :
> l'appli l'affiche dans un bandeau.

## Démarrer

Prérequis : Node 22 (`.nvmrc`), npm 10. Pour régénérer les audios provisoires : ffmpeg.

```bash
npm install          # installe tout le monorepo
npm run check        # ce que vérifie la CI : formatage, lint, types, tests, packs
cd apps/mobile
npx expo start       # puis scanner le QR code avec Expo Go (SDK 57) sur Android
```

## Lancer l'API (facultatif)

Sans API, l'appli marche entièrement hors-ligne. Pour tester la sauvegarde sur serveur (Docker requis) :

```bash
cp .env.example .env                 # puis remplacer les valeurs « a-remplacer »
docker compose up -d --build         # PostgreSQL + MinIO + API sur http://localhost:3000
curl http://localhost:3000/v1/health # {"status":"ok"}
echo "EXPO_PUBLIC_API_URL=http://<IP-de-ton-poste>:3000" > apps/mobile/.env
```

Avec Expo Go, l'adresse doit être celle du poste sur le Wi-Fi (pas `localhost`). Un APK de test
(build « release ») refuse le HTTP non chiffré : il lui faut une API en HTTPS.

Développer l'API sans Docker pour elle : `docker compose up -d postgres`, puis `npm run api:dev`.
Tests de l'API : créer une base jetable (`docker compose exec postgres createdb -U gbe gbe_test`), puis
`TEST_DATABASE_URL=postgresql://gbe:<mot-de-passe>@localhost:5432/gbe_test npm test`.

| Route                            | Rôle                                                      |
| -------------------------------- | --------------------------------------------------------- |
| `POST /v1/auth/guest`            | crée un compte invité, rend identifiant + secret + jeton  |
| `POST /v1/auth/token`            | échange identifiant + secret contre un jeton d'une heure  |
| `POST /v1/sync/events`           | reçoit jusqu'à 500 événements ; les doublons sont ignorés |
| `GET /v1/sync/events`            | rend le journal du compte, par pages de 500 (curseur)     |
| `GET /v1/progress`               | progression recalculée côté serveur (contrôle)            |
| `POST /v1/account/recovery-code` | crée le code de récupération (remplace le précédent)      |
| `POST /v1/auth/recover`          | code de récupération → compte, nouveau secret et jeton    |
| `DELETE /v1/account`             | supprime le compte et tout son journal                    |
| `PUT /v1/me`                     | enregistre le pseudo (tiré dans les listes de l'appli)    |
| `GET /v1/league`                 | groupe de la Ligue de la semaine, classé par XP           |
| `GET /v1/health`                 | état du service et de la base                             |
| `GET /confidentialite`           | politique de confidentialité (à déclarer sur Google Play) |
| `GET /suppression-du-compte`     | comment supprimer son compte (exigé par Google Play)      |

Pour un APK à installer sur des téléphones de test : `npx eas-cli build --profile preview --platform android`
(compte Expo gratuit nécessaire). Pour le Play Store : profil `production` (fichier `.aab`).

## Organisation

```
apps/mobile/              appli Expo (React Native, Expo Router)
  src/app/                routes : (tabs)/index = chemin, (tabs)/sons, bienvenue, lecon/[id], histoire/[id], fin
  src/features/           un dossier par fonctionnalité : onboarding, path, lesson, story, sounds
  src/core/               contenu, base SQLite, journal d'événements, audio, synchro, traductions (fr.ts)
apps/api/                 API NestJS : comptes invités, synchronisation du journal, suppression du compte
database/migrations/      migrations SQL de PostgreSQL (Drizzle)
infra/                    Dockerfile de l'API
packages/domain/          règles du jeu pures : correction, XP, vies, série, objectif, session, chemin
packages/content-schema/  format des packs (Zod) et validation (NFC, références, empreintes)
packages/ui/              design system : couleurs, polices, boutons, cases, Galet, vendeuse, icônes
content/packs/            sources des leçons : pack.json, audios, manifest.json
scripts/                  validation et préparation des packs, audios provisoires
docs/adr/                 décisions d'architecture (dont les écarts à la maquette)
```

## Comment ça marche

- **Contenu = données.** Une unité est un _pack_ (`pack.json` + audios + `manifest.json`).
  Il est validé par Zod au chargement ; aucun mot fon n'est écrit dans le code.
- **Le téléphone fait foi.** Chaque fait de jeu (leçon terminée, vie perdue, calebasse ouverte)
  devient un événement à identifiant unique, enregistré dans SQLite. La progression est recalculée
  à partir de ce journal : le rejouer, même avec des doublons, donne le même résultat.
  Ce journal est envoyé à l'API par lots, au démarrage, au retour dans l'appli et après chaque
  leçon ; le serveur ignore les doublons. Hors-ligne, rien ne change pour l'apprenant.
- **Règles pures.** Les écrans affichent et délèguent ; toute décision (juste/faux, XP, vies, série)
  vient de `packages/domain`, testé à 100 % des lignes.

## Remplacer le contenu de test

1. Les experts valident chaque mot et chaque phrase (orthographe, tons, variété de fon).
2. Remplacer les fichiers de `content/packs/u01-salutations/audio/` par les enregistrements
   (AAC `.m4a`, mono, environ 64 kbit/s), en gardant les mêmes noms, ou mettre à jour `pack.json`.
3. Passer `"validated": true`, augmenter `"version"`.
4. `npm run content:build` puis `npm run content:validate`.

## Publier les packs

Les packs sont diffusés sur un stockage compatible S3 derrière un CDN : un dossier par version,
jamais réécrit, et un `catalog.json` que l'appli consulte (`docs/adr/0007`).

```bash
npm run packs:publish                         # dist-packs/ : packs validés par les experts seulement
npm run packs:publish -- --allow-unvalidated  # tests et bêta : publie aussi le pack de test
npm run packs:serve                           # sert dist-packs/ sur le port 8090 (test local)
npm run packs:upload                          # envoie sur S3 (variables S3_* du .env)
npm run packs:publish -- --allow-unvalidated --test-version 2  # test sur téléphone (jamais envoyé)
```

Pour modifier un pack déjà publié : changer ses fichiers, **augmenter `version`** dans `pack.json`,
puis `content:build`, `packs:publish` et `packs:upload`. L'envoi refuse de réécrire une version en ligne.

Côté appli, `EXPO_PUBLIC_PACKS_URL` (dans `apps/mobile/.env`) désigne le dossier du catalogue. Au
démarrage et à chaque retour dans l'appli, elle télécharge les versions plus récentes, vérifie chaque
empreinte, puis les utilise au prochain passage sur le chemin des leçons (jamais en pleine leçon).
Sans cette variable, ou sur le web, l'appli garde le pack embarqué.

## Mettre en ligne

Le guide pas à pas (serveur, HTTPS, packs, sauvegardes, APK de test, fiche Google Play) est dans
[`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md).

## Tests

| Où                        | Quoi                                                               | Nombre |
| ------------------------- | ------------------------------------------------------------------ | ------ |
| `packages/domain`         | règles du jeu, Ligue, pseudos, code, rappel ; propriétés           | 179    |
| `packages/content-schema` | schémas, validation et catalogue des packs                         | 65     |
| `apps/mobile`             | écrans, leçon, synchro, packs, profil, Ligue, récupération, rappel | 193    |
| `apps/api`                | comptes, récupération, synchro, Ligue, pages, ménage (PostgreSQL)  | 54     |
| `e2e/` (Playwright)       | parcours complets sur l'appli web (`npm run e2e:web`)              | 4      |

## Ce qui reste (plan de développement)

- **J4** : premier vrai pack validé et enregistré, téléchargement des packs avec vérification d'empreinte.
- **J5** : unités 2 et 3 (contenu des experts), Sentry.
- **J6–J7** : bêta fermée (12 testeurs, 14 jours), puis publication.

Les règles provisoires (vies, XP, cauris) et les écarts à la maquette sont listés dans
`docs/adr/0003` et `docs/adr/0004` ; les choix de l'API (Drizzle au lieu de Prisma, comptes invités)
dans `docs/adr/0005` et `docs/adr/0006` ; les packs, la bêta et la Ligue dans `docs/adr/0007` à `0009`.
