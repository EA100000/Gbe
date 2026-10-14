# 0010 — Plusieurs unités sur le chemin

- **Date** : 2026-10-14
- **Statut** : accepté (règle de déblocage provisoire)
- **Écart à la maquette** : extension (la maquette ne montre qu'une unité)

## Contexte

Les packs téléchargés peuvent apporter les unités 2, 3… sans nouvelle version de l'appli.
La maquette (écran 2) ne dessine qu'une unité : sa bannière, puis son chemin de leçons.

## Décision

- Le chemin affiche **toutes les unités disponibles, à la suite**, dans l'ordre `unit.order` :
  pour chacune, la bannière et le chemin de la maquette, sans nouvel écran.
- **Déblocage** : une unité s'ouvre quand toutes les leçons de la précédente sont terminées
  (histoire comprise). Une leçon déjà terminée reste toujours rejouable.
- Unité verrouillée : bannière grisée (contraste ≥ 4,5:1), annoncée aux lecteurs d'écran
  (« verrouillée : termine d'abord l'unité N », texte provisoire), sans bouton de guide.
- Une leçon est jouée avec le contenu **de son propre pack** (textes, images, audios) ; l'événement
  « leçon terminée » porte l'identifiant et la version de ce pack.
- Le guide des sons reste celui de la première unité.

## Conséquences

- Pour publier l'unité 2 : un nouveau pack validé, `packs:publish`, envoi ; les téléphones
  l'affichent à la suite de l'unité 1.
- Si les experts préfèrent un autre déblocage (par exemple dès la calebasse de l'unité précédente),
  seule la règle `buildCoursePath` de `packages/domain` change.
