# 0003 — Règles du jeu provisoires (vies, XP, cauris)

- **Date** : 2026-10-13
- **Statut** : proposé — valeurs à confirmer par le porteur du projet
- **Écart au cahier technique** : non (le cahier ne fixe pas ces valeurs)

## Contexte

La maquette montre 5 vies, « +15 XP » et « 90 % » en fin de leçon, et un compteur de cauris,
sans donner les règles. Il fallait des valeurs pour coder le MVP.

## Décision (toutes regroupées dans `packages/domain`)

| Règle | Valeur | Fichier |
|---|---|---|
| Vies au maximum | 5 | `hearts.ts` |
| Recharge | 1 vie toutes les 30 min | `hearts.ts` |
| Réponse fausse (images, phrase) | −1 vie, puis « Réessayer » le même exercice (comme la maquette) | `session.ts` |
| Erreur d'association (paires) | pas de vie perdue, mais l'exercice ne compte pas « du premier coup » | `session.ts` |
| Histoire | pas de vie (la maquette n'en affiche pas) | appli |
| XP d'une leçon | 10, +5 si précision ≥ 80 % | `xp.ts` |
| Précision | exercices réussis du premier coup ÷ nombre d'exercices | `xp.ts` |
| Calebasse | s'ouvre quand l'unité est terminée, +20 cauris, une seule fois | `path.ts` |
| Série | allumée tant qu'hier a été joué ; jour figé à l'heure locale de la leçon | `streak.ts` |

## Conséquences

- Changer une valeur = modifier une constante et ses tests, rien d'autre.
- Textes « Plus de vies » : absents de la maquette, marqués « provisoire » dans `fr.ts`.
