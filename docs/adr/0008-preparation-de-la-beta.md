# 0008 — Préparation de la bêta : hébergement, rapports de plantage, parcours testés

- **Date** : 2026-10-14
- **Statut** : proposé (hébergeur et compte Sentry à choisir par le porteur du projet)
- **Écart au cahier technique** : partiel (packs servis par le serveur en bêta, S3 + CDN ensuite)

## Contexte

La bêta fermée (12 testeurs, 14 jours) demande une API joignable en HTTPS, des packs téléchargeables,
des sauvegardes, des tests de parcours qui protègent les écrans clés, et un moyen de voir les plantages.

## Décision

- **Un seul serveur** (`infra/production/`) : Caddy (HTTPS automatique), API, PostgreSQL.
  Les packs sont des fichiers statiques servis par Caddy (`packs.<domaine>`), envoyés par `rsync`
  sans jamais réécrire une version en ligne. Choix volontairement indépendant de l'hébergeur.
  Le stockage S3 + CDN du cahier reste prêt (`npm run packs:upload`) pour l'après-bêta.
- **Sauvegarde quotidienne** de la base par `pg_dump` (cron), gardée 14 jours et copiée ailleurs.
- **Rapports de plantage** : `@sentry/react-native` (version fournie avec le SDK Expo 57), activé
  seulement si `EXPO_PUBLIC_SENTRY_DSN` est défini. Ni identifiant de compte ni pseudo ; à compléter
  dans Sentry par l'option qui empêche de stocker les adresses IP. Pas encore de module de
  configuration Expo (envoi des cartes de code source) : les traces restent lisibles mais moins
  précises. Le web n'envoie rien.
- **Parcours testés** avec Playwright sur l'appli web (`e2e/`, `npm run e2e:web`) : première leçon,
  progression conservée après rechargement, profil et suppression du compte, guide des sons.
  Lancé par la CI. Les parcours Maestro sur téléphone restent à écrire (il faut un émulateur).
- La pause du son quand l'appli passe en arrière-plan ou reçoit un appel existait déjà ; elle est
  maintenant couverte par des tests.

## Conséquences

- À la charge du porteur du projet : louer le serveur, le nom de domaine, créer le compte Sentry
  (facultatif), remplir `.env.production` et suivre `docs/DEPLOIEMENT.md`.
- Sentry est un service tiers (données hébergées hors du Bénin) : il figure dans la politique de
  confidentialité et devra être déclaré dans le formulaire « Sécurité des données » de Google Play.
- Les modules natifs (Sentry, stockage des packs) n'ont pas été construits dans un APK ici : le
  premier `eas build` les vérifiera.
