# 0020 — Écouter et choisir

- **Date** : 2026-10-21
- **Statut** : accepté (écran 25 validé par le porteur du projet le 21/10/2026)
- **Écart au cahier technique** : non.

## Contexte

Le fon est une langue à tons : reconnaître un mot à l'oreille est la compétence la plus utile, et
la moins travaillée jusqu'ici (écoute seule dans les histoires). Deuxième priorité de l'analyse de
la concurrence, après la révision des erreurs (ADR 0019).

## Décision

- **Exercice `listen_choice`**, construit par l'appli (jamais lu dans un pack) : un mot se fait
  entendre, l'apprenant le choisit parmi quatre mots écrits en fon. Un bouton « Lentement » joue
  l'enregistrement lent s'il existe. Toucher un mot ne le fait pas entendre : ce serait donner la
  réponse. Les deux voix alternent comme partout (ADR 0016).
- **Séance d'écoute** (`/ecoute`, depuis l'onglet Réviser) : jusqu'à 8 mots déjà rencontrés et
  enregistrés, les moins maîtrisés d'abord ; les autres choix sont d'autres mots enregistrés, de
  préférence déjà vus, jamais deux fois le même texte fon. Il faut au moins deux mots rencontrés.
- Mêmes règles que la révision : aucune vie perdue, une erreur revient une fois en fin de séance,
  `practice_completed` en fin de séance, premiers essais en `item_answered` (mode `listen`) ; une
  réponse juste corrige l'erreur en attente.
- **Lecture automatique** à l'arrivée de chaque mot sur téléphone ; sur le web, aucune lecture sans
  geste (règle du cahier) : l'apprenant touche « Réécouter ».

## Conséquences

- Tant que les audios sont des bips de remplacement, l'exercice ne vaut que pour tester le parcours.
- Plus tard, les experts pourront proposer des paires de mots qui ne diffèrent que par le ton ;
  il faudra alors un type d'exercice dans le format de pack.
