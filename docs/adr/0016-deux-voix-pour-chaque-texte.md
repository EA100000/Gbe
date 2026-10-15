# 0016 — Deux voix pour chaque mot et chaque phrase

- **Date** : 2026-10-15
- **Statut** : accepté (choix du porteur du projet : « les deux enregistrent tout »)
- **Écart au cahier technique** : non. Le cahier prévoit deux locuteurs natifs, idéalement une femme
  et un homme, qui valident chacun les enregistrements de l'autre ; il ne disait pas qui lit quoi.

## Contexte

L'équipe aura deux experts : une femme et un homme. Entendre plusieurs voix aide à reconnaître un mot
quel que soit celui qui le dit. Le format de pack ne connaissait qu'un audio par texte et par vitesse,
et le classeur des experts (ADR 0014) faisait tout lire par la voix A, sauf la vendeuse de l'histoire.

## Décision

- **Voix A = l'homme, voix B = la femme.** Les identifiants `A` et `B` du format ne changent pas.
- **Chaque mot et chaque phrase est enregistré par les deux voix, aux deux vitesses** : quatre prises,
  `<réf>-a-n`, `<réf>-b-n`, `<réf>-a-l`, `<réf>-b-l` (a/b = voix, n/l = normale/lente).
- Un champ facultatif **`group`** sur un audio réunit les prises interchangeables d'un même texte
  (`<réf>-n`, `<réf>-l`). Le contrôle des packs exige, dans un groupe, la même vitesse et au plus une
  prise par voix (code `audio_group`). Les éléments et les exercices citent la prise de la voix A.
- **L'appli alterne les voix** : chaque écoute d'un texte à deux prises passe à la voix suivante,
  avec un tour commun à toute l'appli. Le préchargement d'une leçon prend toutes les prises.
- **Dans l'histoire, chaque personnage garde sa voix** : l'apprenant, l'homme ; la vendeuse, la femme.
  Pas de groupe pour les répliques : une voix qui change au milieu d'un dialogue dérouterait.
- L'import écrit **une liste d'enregistrements par voix**, `enregistrements-homme.csv` et
  `enregistrements-femme.csv`, à côté du classeur : chaque expert a la sienne.

## Conséquences

- Deux fois plus d'enregistrements par unité (environ 4 par mot ou phrase, plus les répliques), et
  donc un pack plus lourd. À surveiller quand les vrais audios arriveront.
- Compatibilité : une appli plus ancienne ignore `group` (Zod retire les clés inconnues) et joue
  toujours la voix A. L'unité 1, faite à la main sans groupe, fonctionne sans changement.
- Les phrases du lexique à la première personne sont dites par les deux voix : les plans en français
  ont pris un prénom mixte (« Je m'appelle Camille. », unité 4) et les accords « (e) »
  (« Je suis étudiant(e). »). Dans l'histoire, l'apprenant reste un homme.
- L'atelier des voix (outil web des experts) s'appuie sur ces listes : un dossier par voix.
