import { LEAGUE_GROUP_SIZE, LEAGUE_TOP_COUNT, leagueWeek, rankLeague } from '@gbe/domain';
import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { Database } from '../db/database';
import { users } from '../db/schema';
import { CLOCK, DATABASE, type Clock } from '../tokens';

export interface LeagueMemberView {
  rank: number;
  /** `null` si l'apprenant n'a jamais envoyé de pseudo (ancienne version de l'appli). */
  pseudo: string | null;
  xp: number;
  isMe: boolean;
}

export interface LeagueView {
  weekKey: string;
  /** Fin de la semaine, en millisecondes depuis 1970. */
  endsAt: number;
  groupSize: number;
  topCount: number;
  members: LeagueMemberView[];
}

@Injectable()
export class LeagueService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async setPseudo(userId: string, pseudo: string): Promise<void> {
    await this.db.update(users).set({ pseudo }).where(eq(users.id, userId));
  }

  /**
   * Groupe de la semaine de l'apprenant, classé. Le premier appel de la semaine l'inscrit
   * dans le dernier groupe ouvert, ou dans un nouveau groupe s'il est plein.
   * Les identifiants des autres apprenants ne sortent jamais du serveur.
   */
  async leagueFor(userId: string): Promise<LeagueView> {
    const week = leagueWeek(this.clock.now().getTime());
    const group = await this.join(userId, week.key);

    const rows = await this.db.execute<{
      user_id: string;
      pseudo: string | null;
      joined_at: Date | string;
      xp: string | number;
    }>(sql`
      select m.user_id, u.pseudo, m.joined_at,
             coalesce(sum((e.payload ->> 'xp')::int), 0) as xp
      from league_members m
      join users u on u.id = m.user_id
      left join events e
        on e.user_id = m.user_id
       and e.type = 'lesson_completed'
       and e.at >= ${week.start} and e.at < ${week.end}
      where m.week_key = ${week.key} and m.group_number = ${group}
      group by m.user_id, u.pseudo, m.joined_at
    `);

    const ranked = rankLeague(
      rows.rows.map((r) => ({
        userId: r.user_id,
        pseudo: r.pseudo,
        xp: Number(r.xp),
        joinedAt: new Date(r.joined_at).getTime(),
      })),
    );
    return {
      weekKey: week.key,
      endsAt: week.end,
      groupSize: LEAGUE_GROUP_SIZE,
      topCount: LEAGUE_TOP_COUNT,
      members: ranked.map((m) => ({
        rank: m.rank,
        pseudo: m.pseudo,
        xp: m.xp,
        isMe: m.userId === userId,
      })),
    };
  }

  /** Inscrit l'apprenant dans un groupe de la semaine (une seule fois) et renvoie son numéro. */
  private async join(userId: string, weekKey: string): Promise<number> {
    return this.db.transaction(async (tx) => {
      // Un verrou par semaine : deux inscriptions simultanées ne dépassent jamais 30 par groupe.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`league:${weekKey}`}))`);
      const existing = await tx.execute<{ group_number: number }>(sql`
        select group_number from league_members where week_key = ${weekKey} and user_id = ${userId}
      `);
      const mine = existing.rows[0];
      if (mine !== undefined) return mine.group_number;

      const last = await tx.execute<{ group_number: number; size: string | number }>(sql`
        select group_number, count(*) as size from league_members
        where week_key = ${weekKey}
        group by group_number order by group_number desc limit 1
      `);
      const lastGroup = last.rows[0];
      const group =
        lastGroup === undefined
          ? 1
          : Number(lastGroup.size) < LEAGUE_GROUP_SIZE
            ? lastGroup.group_number
            : lastGroup.group_number + 1;
      await tx.execute(sql`
        insert into league_members (week_key, group_number, user_id)
        values (${weekKey}, ${group}, ${userId})
      `);
      return group;
    });
  }
}
