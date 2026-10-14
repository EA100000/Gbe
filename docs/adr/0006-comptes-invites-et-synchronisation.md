# 0006 — Comptes invités automatiques et synchronisation du journal

- **Date** : 2026-10-14
- **Statut** : accepté (choix « Compte invité auto » du porteur du projet)
- **Écart au cahier technique** : non (précise les comptes gérés par l'API)

## Contexte

La maquette ne contient ni écran d'inscription ni écran de connexion. Le téléphone fait foi
pendant la leçon ; le serveur doit recevoir le journal d'événements pour sauvegarder la
progression, préparer le changement de téléphone et mesurer l'usage de la bêta.

## Décision

- **Compte invité créé sans écran**, au premier événement à envoyer (pas au premier lancement :
  aucun compte vide n'est créé pour quelqu'un qui ouvre l'appli et la referme).
- L'API rend un identifiant (UUID) et un **secret aléatoire de 32 octets**. Le serveur ne garde
  que l'empreinte Argon2 du secret. Sur téléphone, le secret est dans le stockage chiffré du système
  (`expo-secure-store`) ; sur le web, dans le stockage du navigateur.
- **Aucune donnée personnelle** : ni e-mail, ni nom, ni numéro. L'adresse IP ne sert qu'à la limite
  de débit (en mémoire, non enregistrée).
- Jetons d'accès JWT d'**une heure** ; l'appli en redemande un avec son secret.
- **Synchronisation** : les événements non envoyés partent par lots de 200 au démarrage, au retour de
  l'appli au premier plan et 3 secondes après un nouvel événement. Le serveur ignore les doublons
  (`ON CONFLICT DO NOTHING`) : renvoyer tout le journal ne fausse rien. Hors-ligne, rien ne change
  pour l'apprenant.
- Sans `EXPO_PUBLIC_API_URL` au build, la synchronisation est désactivée (démo web, tests).
- Si le serveur refuse le compte (supprimé, base remise à zéro), l'appli en crée un nouveau.

## Conséquences

- Pas de friction à l'arrivée, conforme à la maquette.
- **Désinstaller l'appli = perdre le lien avec le compte** (le secret disparaît). Retrouver sa
  progression sur un autre téléphone demandera un vrai rattachement (e-mail ou code), à concevoir.
- **Suppression du compte** : l'API la permet (`DELETE /v1/account`), mais l'appli n'a pas encore
  d'écran pour la demander. Les règles de Google Play exigent ce chemin (dans l'appli et par une
  page web) pour toute appli qui crée des comptes : à prévoir en J5, avec un écran à ajouter à la
  maquette.
- Formulaire « Sécurité des données » de Google Play : déclarer la progression (activité dans
  l'appli) liée à un identifiant pseudonyme, chiffrée en transit.
- Cas limite connu : si Android restaure la base de l'appli depuis une sauvegarde sans le secret,
  un nouveau compte est créé et les événements déjà marqués « envoyés » ne lui sont pas renvoyés.
  Sans effet pour l'apprenant (le téléphone fait foi) ; à revoir avec le rattachement de compte.
