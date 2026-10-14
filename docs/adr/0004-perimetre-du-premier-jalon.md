# 0004 — Périmètre du jalon J2 « Première leçon hors-ligne »

- **Date** : 2026-10-13
- **Statut** : accepté
- **Écart à la maquette** : oui, listé ci-dessous

## Décision

Livré : écrans 1 à 8 de la maquette, jouables hors-ligne avec le pack de test de l'unité 1.

Écarts assumés, à reprendre plus tard :

1. **Onglets** : seulement « Apprendre » et « Sons ». « Ligue » est prévue en version 2 ;
   « Profil » n'a pas d'écran dans la maquette.
2. **« J'ai déjà un compte »** (écran 1) : retiré tant que les comptes n'existent pas (jalon J3).
3. **Photos** : l'emplacement de la photo d'accueil et la vignette de l'histoire attendent
   les vraies photos du Bénin.
4. **Plus de vies** : la leçon s'ouvre sur un panneau « Plus de vies » aux textes provisoires
   (pas d'écran dans la maquette).
5. **Audio** : bips de remplacement, en attendant les enregistrements des deux experts.
6. **Web** : la progression est gardée dans le stockage du navigateur (`localStorage`, repli en
   mémoire) et non dans SQLite, qui exige des en-têtes d'isolation (COOP/COEP) que les hébergeurs
   simples n'offrent pas. Même contrat de dépôt, mêmes validations Zod (`PersistenceProvider.web.tsx`).
7. **Démo web** : `npm run demo:web` produit un fichier HTML unique (sons et polices intégrés)
   pour faire essayer l'appli par un simple lien. Ce n'est pas la cible de production.

## Conséquences

Le jalon J3 ajoute l'API (NestJS + PostgreSQL), les comptes et l'envoi du journal d'événements.

## Ajouts du 14/10/2026 (Profil)

- Écrans 11 « Profil » et 12 « Supprimer le compte » dessinés dans la maquette puis validés.
- Changer l'objectif du jour depuis le Profil réutilise la liste de l'écran 1, dépliée sur place
  (pas d'écran dédié dans la maquette).
- Variante de texte quand l'appli n'est reliée à aucun serveur (« Ta progression reste sur ce
  téléphone… ») et états « Suppression… » / erreur : provisoires, marqués dans `fr.ts`.
- La ligne « Confidentialité » n'apparaît que si `EXPO_PUBLIC_PRIVACY_URL` est défini.
