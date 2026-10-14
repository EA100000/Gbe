import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Comptes. Au MVP, tous les comptes sont « invités » : l'appli les crée seule
 * au premier lancement et garde un secret aléatoire (haché ici avec Argon2).
 * Aucune donnée personnelle (ni nom, ni e-mail) n'est collectée.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull().default('guest'),
  secretHash: text('secret_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  /** Pseudo de la Ligue, tiré au hasard par l'appli dans des listes fixes (jamais saisi). */
  pseudo: text('pseudo'),
});

/**
 * Journal des événements de jeu reçus des téléphones.
 * La clé (utilisateur, identifiant d'événement) rend l'envoi rejouable sans doublon.
 */
export const events = pgTable(
  'events',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    type: text('type').notNull(),
    at: bigint('at', { mode: 'number' }).notNull(),
    dayKey: text('day_key').notNull(),
    payload: jsonb('payload').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index('events_user_at').on(table.userId, table.at),
  ],
);

/**
 * Groupes de la Ligue : un apprenant rejoint un groupe de la semaine en ouvrant la Ligue.
 * Les XP ne sont pas recopiés ici : ils sont recalculés depuis le journal.
 */
export const leagueMembers = pgTable(
  'league_members',
  {
    weekKey: text('week_key').notNull(),
    groupNumber: integer('group_number').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.weekKey, table.userId] }),
    index('league_members_group').on(table.weekKey, table.groupNumber),
  ],
);
