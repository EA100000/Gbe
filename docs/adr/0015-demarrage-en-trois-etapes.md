# 0015 — Démarrage en trois étapes : pourquoi, niveau, objectif

- **Date** : 2026-10-15
- **Statut** : accepté (écrans 1a et 1b validés par le porteur du projet le 15/10/2026)
- **Écart au cahier technique** : non. Écarts à la maquette : deux écrans ajoutés avant l'écran 1,
  dont la bulle du Galet change.

## Contexte

Le porteur du projet veut un démarrage proche de celui de Duolingo : la mascotte se présente, demande
pourquoi on apprend et quel niveau on a, puis on commence sans compte. Gbè faisait déjà l'essentiel
(accueil du Galet, objectif du jour, compte invité automatique) mais ne posait pas les deux questions.

## Décision

- **Écran 1a « Pourquoi le fon ? »** (`/bienvenue`, étape 1 sur 3) : le Galet se présente (salutation
  fon du pack), 7 raisons au choix, « Continuer » actif après un choix, lien « J'ai déjà un compte »
  (déplacé depuis l'écran 1, seulement quand l'appli a un serveur).
- **Écran 1b « Ton niveau »** (`/niveau`, étape 2 sur 3) : 4 niveaux avec les barres de l'objectif.
  À partir de « Je comprends des phrases simples », un encadré annonce que le test de niveau arrive
  bientôt : en attendant, tout le monde commence à la première leçon. Aucun saut d'unité n'est promis.
- **Écran 1 « Objectif du jour »** (`/objectif`, dernière étape) : inchangé, sauf la bulle du Galet,
  « Dernière question, et on commence ! » (la présentation est passée à l'écran 1a). La maquette de
  l'écran 1 n'a ni barre d'avancement ni bouton retour : il les garde ainsi (retour du système).
- Les réponses sont gardées dans les réglages du téléphone (`learningReason`, `selfLevel`), jamais
  envoyées au serveur. Elles ne changent rien au parcours pour l'instant : elles serviront au test de
  niveau et à adapter les rappels. Les envoyer un jour imposerait de mettre à jour la politique de
  confidentialité et le formulaire « Sécurité des données » de Google Play.
- En fin de démarrage, les trois étapes quittent la pile de navigation : « retour » depuis le chemin
  ne les rouvre pas.

## Conséquences

- Le premier lancement compte deux écrans de plus avant la première leçon.
- Le test de niveau reste à concevoir ; il suppose plusieurs unités publiées.
