# 0018 — La suite du programme sur le chemin

- **Date** : 2026-10-21
- **Statut** : accepté (écran 23 validé par le porteur du projet le 21/10/2026)
- **Écart au cahier technique** : non. Écart à la maquette : écran 23 ajouté sous le chemin.

## Contexte

Une seule unité a son contenu fon ; les unités 2 à 19 n'existent qu'en bons de commande, en français.
Le chemin s'arrêtait donc après l'unité 1, et l'apprenant ne voyait pas où va le cours.

## Décision

- `content/programme.json` liste toutes les unités prévues (identifiant, ordre, titre, sous-titre),
  sans aucun mot fon. `npm run content:build` le génère : titre du pack quand il existe, sinon du bon
  de commande (`content/sources/<pack>/commande.json`). `npm run content:validate` refuse un programme
  invalide (schéma Zod `ProgrammeSchema`) ou pas à jour.
- L'appli embarque ce programme et le valide au chargement ; illisible, il est ignoré (chemin seul).
- Sous le chemin, « La suite du programme » : la section en cours, le nombre d'unités prêtes, puis
  chaque unité prévue sans pack, « En préparation ». Un appui ouvre une feuille qui explique que les
  experts écrivent, enregistrent et relisent l'unité. La règle est pure : `programmeOverview`
  (`packages/domain`), 20 unités par section.
- Une unité disparaît de la liste dès que son pack est là : elle rejoint alors le chemin.

## Conséquences

- Ajouter une unité au programme = ajouter son bon de commande, puis `npm run content:build`.
- Le programme embarqué ne change qu'avec une nouvelle version de l'appli (pas par le CDN).
