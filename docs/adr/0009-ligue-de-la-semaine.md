# 0009 — Ligue de la semaine (écran 9)

- **Date** : 2026-10-14
- **Statut** : accepté pour la bêta (règles provisoires)
- **Écart à la maquette** : oui (une seule ligue, deux textes remplacés)

## Contexte

L'écran 9 de la maquette montre une « Ligue Cauris » : un classement hebdomadaire, 5 niveaux de ligue
(un seul nommé) et « Les 5 premiers montent dans la ligue suivante ». Choix du porteur du projet
(14/10/2026) : **une seule ligue pour la bêta** et **des pseudos tirés au hasard**, jamais saisis.

## Décision

- **Semaine** : du lundi 0 h au dimanche 24 h, heure du Bénin (UTC+1), pour tout le monde.
- **Groupes de 30 au plus**, remplis dans l'ordre où les apprenants ouvrent la Ligue. Ouvrir la Ligue
  inscrit l'apprenant pour la semaine ; ceux qui ne l'ouvrent pas n'apparaissent nulle part.
- **Classement** : XP des leçons terminées dans la semaine, recalculés depuis le journal ; à égalité,
  le premier arrivé dans le groupe passe devant. Avant de lire la Ligue, l'appli envoie ses dernières
  leçons, pour que « Toi » soit à jour.
- **Pseudo** : envoyé par l'appli (`PUT /v1/me`) et refusé s'il ne vient pas des listes communes.
  Les identifiants des autres apprenants ne sortent jamais du serveur.
- **Écarts à la maquette** (textes provisoires dans `fr.ts`) :
  - sous-titre « Classement de la semaine, remis à zéro chaque lundi » au lieu de « Les 5 premiers
    montent dans la ligue suivante » (il n'y a pas encore de ligue suivante) ;
  - séparation « Les 5 premiers » au lieu de « Zone de promotion » ;
  - un seul écusson (celui de la Ligue Cauris) au lieu de la rangée de 5.
- **Sans serveur** (démo web), l'onglet Ligue est masqué. Hors connexion, l'écran propose de réessayer.

## Conséquences

- Pour activer la montée : nommer les 4 autres ligues, puis ajouter le niveau de chaque apprenant
  et le calcul de fin de semaine (montée des 5 premiers).
- Avec 12 testeurs, la bêta n'aura qu'un groupe : la Ligue sera surtout un test d'usage.
- Les XP d'une leçon faite hors-ligne n'apparaissent qu'après la synchronisation suivante.
