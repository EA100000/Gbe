# Mettre Gbè en ligne pour la bêta

Un seul serveur suffit pour la bêta fermée : l'API, sa base PostgreSQL et les packs de leçons,
derrière **Caddy**, qui obtient et renouvelle seul les certificats HTTPS. Tout est décrit dans
`infra/production/`.

```
téléphones ──HTTPS──► Caddy ─┬─► api.<domaine>   → API NestJS → PostgreSQL
                             └─► packs.<domaine> → fichiers statiques (catalogue + packs)
```

## 1. Prérequis

- Un serveur Linux (VPS) avec Docker et Docker Compose, ports 80 et 443 ouverts.
  Ordre de grandeur pour la bêta : 1 à 2 processeurs, 2 Go de mémoire (estimation, à ajuster).
- Un nom de domaine, avec deux enregistrements DNS de type A vers l'adresse IP du serveur :
  `api.<domaine>` et `packs.<domaine>`.

## 2. Installer

```bash
git clone https://github.com/EA100000/Gbe.git /opt/gbe
cd /opt/gbe/infra/production
cp .env.production.example .env.production   # remplir : domaines, secrets, e-mail de contact
docker compose --env-file .env.production up -d --build
```

Vérifier :

```bash
curl https://api.<domaine>/v1/health          # {"status":"ok"}
curl -I https://api.<domaine>/confidentialite # 200
```

## 3. Publier les packs

Sur ton ordinateur, depuis le dépôt :

```bash
npm run content:build && npm run content:validate
npm run packs:publish -- --allow-unvalidated   # bêta ; sans l'option : packs validés seulement
# 1) les versions, sans jamais réécrire une version déjà en ligne ;
rsync -av --ignore-existing dist-packs/packs/ <serveur>:/opt/gbe/infra/production/packs/packs/
# 2) le catalogue en dernier, une fois toutes les versions en place.
rsync -av dist-packs/catalog.json <serveur>:/opt/gbe/infra/production/packs/
```

Vérifier : `curl https://packs.<domaine>/catalog.json`.

Plus tard, pour passer à un stockage S3 avec CDN (comme prévu au cahier) : `npm run packs:upload`
avec les variables `S3_*`, et `EXPO_PUBLIC_PACKS_URL` pointant vers ce stockage.

## 4. Sauvegarder la base (indispensable)

Une sauvegarde par jour, gardée 14 jours sur le serveur. **Copier aussi ces fichiers ailleurs** :
un serveur perdu emporte ses sauvegardes.

```bash
# crontab -e (utilisateur qui lance Docker)
15 3 * * * cd /opt/gbe/infra/production && docker compose --env-file .env.production exec -T postgres pg_dump -U gbe gbe | gzip > backups/gbe-$(date +\%F).sql.gz && find backups -name '*.sql.gz' -mtime +14 -delete
```

Restaurer : `gunzip -c backups/<fichier>.sql.gz | docker compose --env-file .env.production exec -T postgres psql -U gbe gbe`.

## 5. Construire l'appli pour les testeurs

Dans `apps/mobile/.env` (ou dans les variables d'environnement du projet sur expo.dev) :

```bash
EXPO_PUBLIC_API_URL=https://api.<domaine>
EXPO_PUBLIC_PACKS_URL=https://packs.<domaine>
EXPO_PUBLIC_PRIVACY_URL=https://api.<domaine>/confidentialite
# Facultatif, rapports de plantage : voir docs/adr/0008
# EXPO_PUBLIC_SENTRY_DSN=
```

Puis `cd apps/mobile && npx eas-cli build --profile preview --platform android` (APK de test).
Ces valeurs ne sont pas secrètes : elles sont lisibles dans l'appli.

## 6. Fiche Google Play

- Politique de confidentialité : `https://api.<domaine>/confidentialite`
- Suppression du compte : `https://api.<domaine>/suppression-du-compte`
- Ces deux textes sont à **faire relire** avant la publication.

## 7. Mettre à jour le serveur

```bash
cd /opt/gbe && git pull && cd infra/production && docker compose --env-file .env.production up -d --build
```

Les migrations de la base s'appliquent au démarrage de l'API.
