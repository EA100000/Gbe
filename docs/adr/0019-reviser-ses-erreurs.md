# 0019 — Réviser ses erreurs et consolider ses mots

- **Date** : 2026-10-21
- **Statut** : accepté (écrans 24 et 25 validés par le porteur du projet le 21/10/2026)
- **Écart au cahier technique** : non. Écart à la maquette : un 5ᵉ onglet, « Réviser ».

## Contexte

L'analyse de la concurrence plaçait « réviser ses erreurs » en tête des manques face à Duolingo.
L'appli ne gardait que la fin des leçons et les vies perdues : rien sur les mots ratés.

## Décision

- **Nouvel événement `item_answered`** : le premier essai sur un mot ou une phrase (juste ou faux),
  avec son unité et le mode (`lesson`, `review`, `listen`). Un exercice raté puis réussi ne compte
  qu'une fois, faux. Paires : chaque mot fon, faux s'il a été mal associé au moins une fois.
- **Nouvel événement `practice_completed`** : fin d'une séance d'entraînement. Elle donne de l'XP
  (même barème qu'une leçon, provisoire) et compte pour la série, pas pour le chemin.
- **« Mes erreurs »** : un mot raté y reste jusqu'à ce qu'il soit réussi au premier essai en révision
  ou en écoute. Le réussir juste après dans la même leçon ne suffit pas (les paires viennent souvent
  après les images et se devinent par élimination).
- **Maîtrise** : réponses justes parmi les quatre dernières (0 à 4). « Mots à consolider » : maîtrise
  incomplète, la plus faible d'abord. Règles pures : `packages/domain/src/review.ts`.
- **Séance de révision** (`/revision`) : jusqu'à 8 mots, les erreurs d'abord. Une image par mot
  illustré, des paires (3 ou 4) pour les autres. Mêmes écrans qu'une leçon, mais **aucune vie perdue** :
  une erreur passe à la suite et l'exercice revient une fois en fin de séance.
- Les mots de toutes les unités se mêlent : le contenu est fusionné en mémoire, chaque identifiant
  préfixé par son unité (`u01:sin`).

## Conséquences

- Environ dix événements de plus par leçon (journal local, puis synchronisation).
- L'API accepte les nouveaux événements par le schéma partagé ; l'XP d'entraînement compte dans la
  ligue.
- Les barèmes (fenêtre de 4 réponses, 8 mots, 20 s par exercice) sont à ajuster avec l'usage réel.
