# 0002 — Format des packs de leçons (version 1)

- **Date** : 2026-10-13
- **Statut** : accepté
- **Écart au cahier technique** : oui, sur la forme de l'exemple « phrase à construire »

## Contexte

Le cahier donne un exemple de pack avec des clés en français (`consigne_fr`, `phrase_a_construire`)
et une solution exprimée en identifiants d'éléments (`item_bi`, `item_nyi`…).

## Décision

- Clés en anglais *camelCase* (`promptFr`, `build_sentence`) pour rester cohérent avec le code ;
  les textes destinés à l'apprenant gardent le suffixe `Fr` ou sont typés `fon`.
- Les tuiles d'une phrase à construire sont des **textes fon** (normalisés NFC), pas des identifiants :
  un mot outil (« A », « yi ») n'a pas toujours sa fiche de lexique. `answerFon` donne la phrase
  complète avec sa ponctuation.
- **Texte mixte** (`RichText`) : une suite de morceaux `{ fr }` ou `{ fon }`, pour afficher
  « *sɔ* veut dire hier » avec la police et la langue du fon sur le bon mot.
- **`uiFon`** : les rares expressions fon de l'interface (« Kwabɔ ! », « Ɛɛn ! ») viennent du pack,
  jamais du code.
- **`validated`** : `false` tant que les deux experts n'ont pas validé ; l'appli affiche alors
  un bandeau « contenu de test ».
- Chaque pack livre un `manifest.json` (SHA-256 et taille de chaque fichier). La CI refuse un pack
  dont une empreinte ne correspond pas.
- Le pack de l'unité 1 est **embarqué** dans l'appli pour le premier lancement hors-ligne.
  Son intégrité est garantie par la signature de l'appli et par la CI ; la vérification
  d'empreinte à l'exécution s'appliquera aux packs **téléchargés** (jalon J4).

## Conséquences

- Le back-office et le générateur de packs devront produire exactement ce format (schémas Zod partagés).
- Tout changement incompatible crée `formatVersion: 2` ; l'appli refuse un format qu'elle ne connaît pas.
