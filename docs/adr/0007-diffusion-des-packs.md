# 0007 — Diffusion des packs : catalogue statique et versions immuables

- **Date** : 2026-10-14
- **Statut** : accepté
- **Écart au cahier technique** : non (précise « stockage compatible S3 + CDN, fichiers immuables et versionnés »)

## Contexte

Les packs doivent pouvoir changer sans nouvelle version de l'appli : enregistrements des locuteurs,
corrections des experts, nouvelles unités. L'appli doit rester utilisable hors-ligne et n'utiliser
un pack qu'après en avoir vérifié l'empreinte.

## Décision

- **Un dossier par version, jamais réécrit** : `packs/<id>/<version>/` contient `manifest.json`,
  `pack.json` et les audios. Changer un fichier impose d'augmenter `version` dans `pack.json`.
- **Un seul fichier qui change** : `catalog.json`, à la racine du stockage. Il liste, pour chaque
  pack, sa dernière version, son chemin et l'**empreinte SHA-256 de son manifeste**. Le manifeste
  donne à son tour l'empreinte de chaque fichier : l'appli vérifie toute la chaîne.
- **Catalogue servi par le CDN, pas par l'API** : rien à calculer côté serveur, mise en cache facile
  (fichiers de pack : un an, `immutable` ; catalogue : 5 minutes). L'API reste indépendante du contenu.
- **Publication en deux temps** :
  1. `npm run packs:publish` construit `dist-packs/` à partir de `content/packs/`, après validation
     complète. Seuls les packs `validated: true` sont publiés, sauf avec `--allow-unvalidated`
     (tests, bêta : l'appli affiche alors son bandeau d'avertissement).
  2. `npm run packs:upload` envoie sur le stockage S3. Un fichier déjà en ligne à l'identique est
     ignoré ; en ligne avec un autre contenu, l'envoi s'arrête. Le catalogue part en dernier.
- En local : MinIO (`docker compose`, seau `gbe-packs` lisible par tous) ou `npm run packs:serve`.

## Conséquences

- Mettre à jour l'unité 1 avec les vrais enregistrements = augmenter sa version, publier, envoyer.
  Les téléphones la récupèrent seuls (voir la synchronisation des packs dans l'appli).
- Une ancienne version reste en ligne : un téléphone qui la télécharge pendant la mise à jour
  du catalogue obtient un pack complet et cohérent.
- Plus tard, le back-office des linguistes pourra écrire le catalogue à la place du script.

## Côté appli

- Une version téléchargée est vérifiée de bout en bout (catalogue → manifeste → chaque fichier, puis
  validation Zod) dans un dossier temporaire, puis déplacée d'un bloc dans `packs/<id>/<version>/`.
- Au démarrage, l'appli garde pour chaque pack la version la plus récente entre le pack embarqué et
  les versions installées encore intactes, et efface les autres.
- Une version arrivée pendant la session n'est appliquée que sur le chemin des leçons.
- Limites actuelles : l'appli n'affiche encore qu'une unité (l'affichage de plusieurs unités viendra
  avec le contenu de l'unité 2) ; le web garde le pack embarqué.
