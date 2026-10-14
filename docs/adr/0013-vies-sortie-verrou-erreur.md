# 0013 — Plus de vies, quitter une leçon, unité verrouillée, écran d'erreur

- **Date** : 2026-10-14
- **Statut** : accepté (écrans 16 à 19 validés par le porteur du projet le 14/10/2026)
- **Écart au cahier technique** : non. Remplace des états provisoires (ADR 0003, 0010).

## Contexte

La maquette d'origine ne dessinait ni la fin des vies, ni la sortie d'une leçon, ni une unité
verrouillée, ni le cas d'un plantage. L'appli les gérait de façon provisoire : message en bas de
la leçon, sortie sans confirmation (perte de la leçon en cours, y compris par le bouton « retour »
d'Android), bannière grise sans explication visible, écran d'erreur par défaut.

## Décision

- **Écran 16 « Plus de vies »** (`/vies`) : cœurs vides, « Prochaine vie dans … » et « Toutes tes
  vies dans … » (règle de recharge de l'ADR 0003 : une vie toutes les 30 minutes), retour au
  chemin, lien vers les sons du fon (qui ne coûtent pas de vie). Il s'ouvre :
  - quand la dernière vie est perdue : la correction de la réponse s'affiche d'abord, puis
    « Continuer » mène à l'écran 16 ;
  - quand on touche une leçon du chemin sans vie : la leçon ne démarre plus.
- **Écran 17 « Tu pars déjà ? »** : feuille de confirmation depuis la croix et le bouton « retour »
  d'Android. Le texte dit que les vies perdues restent perdues. Hors du périmètre : les histoires,
  qui ne coûtent pas de vie, se quittent sans confirmation.
- **Écran 18 « Unité verrouillée »** : bannière grisée avec cadenas et « Termine l'unité N pour
  l'ouvrir » visible (et plus seulement lu par les lecteurs d'écran).
- **Écran 19 « Oups, un souci ! »** : `ErrorBoundary` d'Expo Router à la racine. « Réessayer »
  relance l'écran, « Retour au chemin » revient à l'accueil. L'erreur est envoyée à Sentry quand il
  est actif (ADR 0008). L'écran ne dépend d'aucun fournisseur de l'appli, qui peut être en cause.

## Conséquences

- Texte provisoire restant : « Une vie est revenue ! » quand une vie revient pendant que
  l'écran 16 est ouvert.
- Le décompte de l'écran 16 se rafraîchit toutes les 15 secondes et s'arrondit à la minute
  supérieure (« 2 h 24 »).
