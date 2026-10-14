# 0012 — Rappel quotidien

- **Date** : 2026-10-14
- **Statut** : accepté (écran 15 « Rappel quotidien » validé par le porteur du projet le 14/10/2026)
- **Écart au cahier technique** : non (fonction prévue hors maquette d'origine, écran ajouté et validé)

## Contexte

La série et l'objectif du jour ne tiennent que si l'apprenant revient chaque jour. Il fallait
un rappel, sans compte e-mail ni serveur de notifications.

## Décision

- **Notifications locales** (`expo-notifications`), programmées par le téléphone : aucune donnée
  ne part vers un serveur, pas de jeton push. Elles fonctionnent dans Expo Go sur Android (seules
  les notifications push en ont été retirées au SDK 53). Sur le web, le rappel n'est pas proposé.
- **Heure au choix** : matin 7 h, midi 12 h, soir 19 h (par défaut), nuit 21 h, ou « Autre
  heure… » : une heure entière de 6 h à 23 h. Pas de minutes, pour garder un écran simple.
- **Pas de rappel le jour où l'objectif est déjà atteint** (règle de l'écran 15), ni quand
  l'heure est passée. Les rappels sont programmés **7 jours à l'avance**, un par jour, et
  reprogrammés à chaque ouverture de l'appli, après chaque leçon et à chaque réglage.
  Sans ouverture pendant 7 jours, les rappels s'arrêtent : on ne relance pas indéfiniment.
- **Message** : « C'est l'heure de ta leçon ! » et la série quand elle est sûre de tenir
  (aujourd'hui ; demain si l'apprenant a joué aujourd'hui). Sinon un message général
  (texte provisoire : « Quelques minutes suffisent pour avancer en fon. »).
- **Proposé une seule fois**, après la première leçon terminée (« Activer le rappel » ou
  « Plus tard »). Ensuite, réglage dans Profil › Rappel quotidien.
- **Autorisation** : demandée seulement quand l'apprenant active le rappel. Refusée
  définitivement : l'écran le dit et propose « Ouvrir les réglages ». Sous Android 8+, les
  rappels ont leur propre canal (« Rappel quotidien »), réglable dans le téléphone.
- Règles pures dans `packages/domain/src/reminder.ts` (plan, heure locale, changement d'heure),
  programmation dans `apps/mobile/src/core/reminders/`.

## Conséquences

- Un rappel peut arriver quelques minutes en retard : sans l'autorisation « alarmes exactes »
  (Android 12+), le système regroupe les réveils. Acceptable pour un rappel quotidien.
- Si l'apprenant change de fuseau horaire, les rappels suivent au prochain lancement.
- Dans Expo Go, `expo-notifications` affiche un avertissement jaune au démarrage (« not fully
  supported in Expo Go ») : il concerne les notifications push, pas ce rappel.
