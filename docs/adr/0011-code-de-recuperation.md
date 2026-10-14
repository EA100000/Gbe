# 0011 — Code de récupération du compte

- **Date** : 2026-10-14
- **Statut** : accepté (écrans 13 « Code de récupération » et 14 « J'ai déjà un compte » validés
  par le porteur du projet le 14/10/2026)
- **Écart au cahier technique** : non. Réalise le rattachement prévu par l'ADR 0006
  (« e-mail ou code, à concevoir ») sans collecter de donnée personnelle.

## Contexte

Le compte invité (ADR 0006) vit sur un seul téléphone : le perdre ou réinstaller l'appli faisait
perdre la progression. Le lien « J'ai déjà un compte » de l'écran 1 était retiré depuis le premier
jalon (ADR 0004). Il fallait un moyen de retrouver sa progression sans e-mail ni numéro.

## Décision

- **Un code de 12 caractères** en trois groupes (`K7QM-3XRP-T9WD`), alphabet de Crockford
  (chiffres et majuscules sans I, L, O, U), soit 60 bits de hasard. La saisie tolère minuscules,
  espaces, tirets et les confusions O/0, I/1, L/1 (`packages/domain/src/recovery-code.ts`).
- **Le serveur ne garde qu'une empreinte HMAC-SHA256** du code, avec une clé dérivée de
  `JWT_SECRET` et propre à cet usage. Elle est déterministe (pour retrouver le compte à partir du
  code seul, sans identifiant) et inutilisable sans la clé si la base fuitait. Argon2 n'est pas
  possible ici : il faudrait connaître le compte avant de vérifier.
- `POST /v1/account/recovery-code` (connecté) crée le code et le rend **une seule fois** ; un nouveau
  code remplace l'ancien. L'appli le garde dans le stockage chiffré du téléphone pour le réafficher.
- `POST /v1/auth/recover` (limité comme la connexion : 10 essais par minute et par adresse IP) rend
  l'identifiant, un **nouveau secret** et un jeton. **L'ancien téléphone perd l'accès** au compte :
  un compte suit un seul téléphone à la fois, ce qui évite deux journaux divergents. Le code reste
  valable (il est noté sur papier) ; le nouveau téléphone le garde.
- `GET /v1/sync/events` rend le journal par pages de 500 (curseur opaque date + identifiant).
  L'appli le recopie, déjà marqué comme synchronisé, puis recalcule la progression.
- Le lien « J'ai déjà un compte » n'apparaît que sur l'écran 1 (premier lancement) et seulement si
  l'appli est reliée à une API. Le compte retrouvé **remplace** le contenu du téléphone (vide à ce
  stade) ; il n'y a pas de fusion.

## Conséquences

- Changer `JWT_SECRET` rend caducs les codes déjà donnés : à éviter, ou prévenir les apprenants.
  Une clé séparée (`RECOVERY_SECRET`) pourra être ajoutée si une rotation régulière est voulue.
- Quiconque a le code peut prendre le compte : l'écran 13 le dit (« Garde-le pour toi »).
  L'enjeu reste faible (progression d'apprentissage, aucune donnée personnelle).
- Sans code, un compte perdu ne peut pas être retrouvé : c'est le prix de l'absence d'e-mail,
  affiché sur les écrans 13 et 14. La page Confidentialité mentionne l'empreinte du code.
- Après récupération, l'ancien téléphone reçoit un refus à sa prochaine connexion et repart d'un
  nouveau compte invité pour ses événements suivants (comportement existant de l'ADR 0006).
