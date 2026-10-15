# 0014 — Classeur des experts et import automatique des unités

- **Date** : 2026-10-15
- **Statut** : accepté (route choisie par le porteur du projet le 15/10/2026)
- **Écart au cahier technique** : oui. Le cahier prévoit un outil web pour les linguistes
  (`apps/backoffice`). Il reste mis de côté ; un classeur Excel le remplace pour l'instant.

## Contexte

Une seule unité existe (5 leçons, non relues). Le cahier en prévoit trois pour la première version,
et le paiement par unité (ADR 0015) suppose un flux régulier d'unités. Le frein n'est pas le code
(une unité est un pack, ADR 0002 et 0010) mais l'écriture du fon par les deux experts. Écrire un
`pack.json` à la main est hors de leur portée, et l'atelier web représente plusieurs semaines.

## Décision

- **Un classeur `.xlsx` par unité**, rempli par les experts dans Excel, LibreOffice ou Google Sheets.
  Feuilles : Mode d'emploi, Unité, Leçons, Mots, Phrases, Histoire, Question, Choix. Les cases du fon
  sont en jaune ; le reste est une proposition en français qu'ils peuvent modifier.
- **Bon de commande** : `content/sources/<pack>/commande.json` décrit le plan en français
  (aucun mot fon). `npm run content:workbook -- --commande …` en tire le classeur à envoyer.
- **Import** : `npm run content:import -- <classeur.xlsx>` écrit `content/packs/<pack>/pack.json`
  et `enregistrements.csv` (la liste des fichiers à enregistrer, avec le texte à lire).
  Les erreurs sont listées par feuille et par ligne, en français, et rien n'est écrit tant qu'il en
  reste. Le fon est normalisé en NFC à la lecture. La version augmente seulement si le contenu
  change (ADR 0007). Les durées des audios déjà déposés sont mesurées (ffprobe), sinon estimées.
- **Exercices générés**, de façon déterministe (même classeur, même pack) :
  - leçon ordinaire : chaque mot illustré en « choisir l'image » (jusqu'à 4 images, de la même
    leçon d'abord), les autres mots en paires (groupes de 3 à 4, complétés par des mots déjà vus),
    chaque phrase en « traduis en fon » (2 ou 3 leurres pris dans les autres tuiles de l'unité,
    jamais une tuile de la réponse), puis une révision de la leçon en paires (6 au plus) ;
  - leçon de révision : rien de nouveau ; paires de phrases, deux phrases à construire, une image,
    paires de mots, tirés des leçons précédentes ;
  - histoire : une par unité, répliques dans l'ordre ; voix B pour la vendeuse, voix A pour
    l'apprenant ; explication par défaut « [fon] : « sens » » si les experts n'en écrivent pas.
- **Audios** : chaque mot et chaque phrase en vitesse normale et lente (voix A), chaque réplique de
  l'histoire en vitesse normale. Fichiers `audio/<réf>-n.m4a`, `-l.m4a`, `histoire-<n>.m4a`.
- **Dessins** : un SVG par mot illustré, dans `content/sources/<pack>/illustrations/<réf>.svg`.
  Un dessin manquant bloque l'import.
- **Validation** : le pack n'est marqué validé que si les experts ont écrit « oui » dans la feuille
  Unité. `content:validate` reste le contrôle bloquant de la CI.
- Le code vit dans `packages/content-tools` (Node seulement, testé), jamais importé par l'appli.

## Conséquences

- Les experts travaillent avec un outil qu'ils connaissent, en parallèle de l'appli.
- Les exercices suivent des règles fixes : moins fins qu'un choix fait à la main. Les experts
  valident le résultat dans l'appli avant de passer « Validé » à oui ; une règle peut évoluer ici.
- L'unité 1, écrite à la main, n'a pas de classeur. Elle pourra en avoir un plus tard.
- L'atelier web reste possible : il produirait le même pack.
