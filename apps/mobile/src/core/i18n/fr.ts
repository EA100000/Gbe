/**
 * Chaînes de l'interface, en français (langue de départ).
 * Aucun mot fon ici : le fon vient uniquement des packs validés par les experts.
 * Les textes marqués « provisoire » ne figurent pas dans la maquette et restent à valider.
 */
export const fr = {
  'common.continue': 'Continuer',
  'common.check': 'Vérifier',
  'common.retry': 'Réessayer',
  'common.listen': 'Écouter',
  'common.correct': 'Réponse juste',
  'common.wrong': 'Réponse fausse',

  // Provisoire : bandeau affiché tant que le pack n'est pas validé par les deux experts.
  'content.testBanner': 'Contenu de test, pas encore validé par les experts',
  'content.loadError': 'Les leçons n’ont pas pu être chargées. Réinstalle l’appli.',

  'welcome.intro': 'Moi, c’est Gbè. Je vais t’apprendre le fon.',
  'welcome.title': 'Combien de temps par jour ?',
  'welcome.goal.relaxed': 'Tranquille',
  'welcome.goal.regular': 'Régulier',
  'welcome.goal.serious': 'Sérieux',
  'welcome.goal.intense': 'Intense',
  'welcome.goal.minutes': '{n} min / jour',
  'welcome.changeLater': 'Tu pourras changer d’objectif à tout moment.',
  'welcome.start': 'C’est parti',

  'tabs.learn': 'Apprendre',
  'tabs.sounds': 'Sons',
  'tabs.league': 'Ligue',
  'tabs.profile': 'Profil',
  'tabs.navigation': 'Navigation principale',

  'path.course': 'Cours : fon',
  'path.courseName': 'Fon',
  'path.streak': 'Série : {n} jours',
  'path.cauris': '{n} cauris',
  'path.hearts': '{n} vies',
  'path.unit': 'Unité {n} · {title}',
  'path.unitGuide': 'Guide de l’unité',
  // Provisoire : l'unité verrouillée n'est pas dessinée dans la maquette (une seule unité).
  'path.unitLocked': 'Unité {n} · {title}, verrouillée : termine d’abord l’unité {previous}',
  'path.start': 'Commencer',
  'path.lesson.done': 'Leçon {n}, terminée : la refaire',
  'path.lesson.current': 'Leçon {n} : commencer',
  'path.lesson.locked': 'Leçon {n}, verrouillée',
  'path.story.done': 'Histoire, terminée : la refaire',
  'path.story.current': 'Histoire : commencer',
  'path.story.locked': 'Histoire, verrouillée',
  'path.chest.locked': 'Calebasse-récompense, verrouillée',
  'path.chest.open': 'Calebasse-récompense, ouverte',
  'path.trophy.locked': 'Fin d’unité, verrouillée',
  'path.trophy.open': 'Fin d’unité, terminée',

  'lesson.quit': 'Quitter la leçon',
  'lesson.progress': 'Progression de la leçon',
  'lesson.heartsLeft': '{n} vies restantes',
  'lesson.tag.new': 'Nouveau',
  'lesson.meaning': ' veut dire « {fr} »',
  'lesson.meaningNote': ' veut dire « {fr} » ({note})',
  'lesson.image.correct': 'Bravo !',
  'lesson.image.wrong': 'Pas tout à fait…',
  'lesson.loseHeart': ' Tu perds une vie.',
  'lesson.build.correct': 'Excellent !',
  'lesson.build.wrong': 'Bonne réponse :',
  'lesson.build.answerZone': 'Ta réponse',
  'lesson.build.listen': 'Écouter la phrase',
  'lesson.build.add': 'Ajouter {word}',
  'lesson.build.remove': 'Retirer {word}',
  'lesson.pairs.correct': 'Parfait !',
  'lesson.pairs.help': 'Touche un mot fon, puis sa traduction.',
  'lesson.pairs.count': '{n}/{total}',
  'lesson.pairs.found': '{word}, paire trouvée',
  // Provisoire : pas d'écran « plus de vies » dans la maquette.
  'lesson.outOfHearts.title': 'Plus de vies',
  'lesson.outOfHearts.body': 'Ta prochaine vie arrive dans {n} min.',
  'lesson.outOfHearts.back': 'Retour au chemin',

  'end.title': 'Leçon terminée !',
  'end.xp': 'XP gagnés',
  'end.accuracy': 'Précision',
  'end.duration': 'Durée',
  'end.streak.one': 'Série de {n} jour !',
  'end.streak.other': 'Série de {n} jours !',
  'end.streakBody': 'Reviens demain pour la garder allumée.',
  'end.storyUnlocked': 'Histoire débloquée',

  'story.quit': 'Quitter l’histoire',
  'story.translate': 'Afficher la traduction',
  'story.header': 'Histoire · {setting}',
  'story.listenLine': 'Écouter « {text} »',
  'story.listenVendor': 'Écouter la réponse de la vendeuse',
  'story.progress': 'Progression de l’histoire',

  'sounds.kicker': 'Prononciation',
  'sounds.title': 'Les sons du fon',
  'sounds.intro': 'Touche une carte pour l’écouter et la répéter.',
  'sounds.letters': 'Lettres propres au fon',
  'sounds.nasals': 'Voyelles nasales',
  'sounds.tones': 'Les tons',
  'sounds.tonesIntro':
    'Le fon est une langue à tons : la hauteur de la voix fait partie du mot. Les accents l’indiquent.',
  'sounds.funFact': 'Le savais-tu ?',
  'sounds.listenCard': 'Écouter {word} : {meaning}',
  'sounds.listenNasal': 'Écouter {symbol}',
  'sounds.empty': 'Le guide des sons arrive avec le prochain pack.',

  // Écran 9 : Ligue de la semaine.
  'league.title': 'Ligue Cauris',
  // Provisoire : une seule ligue pendant la bêta, donc pas encore de montée (texte de la maquette remplacé).
  'league.subtitle': 'Classement de la semaine, remis à zéro chaque lundi',
  'league.top': 'Les {n} premiers',
  'league.daysLeft.one': 'Encore {n} jour',
  'league.daysLeft.other': 'Encore {n} jours',
  'league.me': 'Toi',
  'league.xp': '{n} XP',
  'league.row': 'Rang {rank} : {name}, {n} XP',
  // Provisoire : états non dessinés dans la maquette.
  'league.anonymous': 'Apprenant',
  'league.loading': 'Chargement de la Ligue',
  'league.offline': 'La Ligue a besoin d’une connexion internet.',

  // Écrans 11 et 12 (proposition validée le 14/10/2026).
  'profile.pseudoCaption': 'Ton nom dans la Ligue',
  'profile.pseudoChange': 'Changer de pseudo',
  'profile.stats': 'Mes progrès',
  'profile.streak.one': '{n} jour',
  'profile.streak.other': '{n} jours',
  'profile.streakLabel': 'Série',
  'profile.xpLabel': 'XP au total',
  'profile.lessonsLabel': 'Leçons terminées',
  'profile.caurisLabel': 'Cauris',
  'profile.goal': 'Objectif du jour',
  'profile.goalChange': 'Changer',
  'profile.goalCurrent': 'Objectif : {goal}, {minutes}. Changer',
  'profile.account': 'Mon compte',
  'profile.accountBody':
    'Ta progression est sur ce téléphone et sauvegardée sur nos serveurs, sans e-mail ni nom.',
  // Provisoire : variante quand l'appli n'est reliée à aucun serveur.
  'profile.accountBodyLocal': 'Ta progression reste sur ce téléphone, sans e-mail ni nom.',
  'profile.privacy': 'Confidentialité',
  'profile.delete': 'Supprimer mon compte',

  'delete.close': 'Retour au profil',
  'delete.title': 'Supprimer ton compte ?',
  'delete.body':
    'Ta progression, ta série et tes cauris seront effacés de ce téléphone et de nos serveurs. Tu ne pourras pas les récupérer.',
  'delete.item.lessons': 'Leçons terminées et XP',
  'delete.item.streak': 'Série et cauris',
  'delete.item.league': 'Place dans la Ligue',
  'delete.keep': 'Garder mon compte',
  'delete.confirm': 'Supprimer définitivement',
  'delete.after': 'Ensuite, l’appli repart de zéro, comme au premier lancement.',
  // Provisoire : états non dessinés dans la maquette.
  'delete.working': 'Suppression…',
  'delete.error': 'La suppression n’a pas abouti. Réessaie.',
} as const;

export type TranslationKey = keyof typeof fr;
