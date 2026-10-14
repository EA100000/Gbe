import { leagueDaysLeft } from '@gbe/domain';
import { colors } from '@gbe/ui';
import { useQuery } from '@tanstack/react-query';

import { t } from '../../core/i18n';
import { useEnsurePseudo } from '../../core/progress/useEnsurePseudo';
import type { LeagueMember } from '../../core/sync/apiClient';
import { useServer } from '../../core/sync/serverContext';
import { useNow } from '../../core/useNow';

/** Couleurs des avatars à initiale (maquette, écran 9) : couleur de fond et de la lettre. */
const AVATAR_COLORS: readonly { bg: string; fg: string }[] = [
  { bg: colors.red, fg: colors.white },
  { bg: colors.blue, fg: colors.white },
  { bg: colors.yellowText, fg: colors.white },
  { bg: colors.redDark, fg: colors.white },
  { bg: colors.blueShadow, fg: colors.white },
  { bg: colors.yellow, fg: colors.ink },
];

/** Couleur stable d'un pseudo : le même apprenant garde la même couleur d'une semaine à l'autre. */
export function avatarColors(pseudo: string): { bg: string; fg: string } {
  let hash = 0;
  for (const char of pseudo) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? { bg: colors.blue, fg: colors.white };
}

export interface LeagueRow {
  key: string;
  rank: number;
  name: string;
  initial: string;
  xp: number;
  isMe: boolean;
  colors: { bg: string; fg: string };
}

function toRow(member: LeagueMember): LeagueRow {
  const name = member.isMe ? t('league.me') : (member.pseudo ?? t('league.anonymous'));
  const pseudo = member.pseudo ?? t('league.anonymous');
  return {
    key: `${member.rank}-${pseudo}`,
    rank: member.rank,
    name,
    initial: pseudo.slice(0, 1).toLocaleUpperCase('fr-FR'),
    xp: member.xp,
    isMe: member.isMe,
    colors: avatarColors(pseudo),
  };
}

/**
 * Ligue de la semaine : envoie d'abord les dernières leçons (pour que « Toi » soit à jour),
 * enregistre le pseudo, puis lit le groupe. Données du serveur : TanStack Query.
 */
export function useLeagueController() {
  const server = useServer();
  const pseudo = useEnsurePseudo();
  const now = useNow();

  const query = useQuery({
    queryKey: ['league', pseudo],
    enabled: server !== null && pseudo !== null,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      if (server === null || pseudo === null) throw new Error('Ligue indisponible');
      await server.engine.sync();
      return server.engine.withAccessToken(async (token) => {
        await server.api.setPseudo(token, pseudo);
        return server.api.league(token);
      });
    },
  });

  const league = query.data;
  return {
    status: query.isError
      ? ('offline' as const)
      : league === undefined
        ? ('loading' as const)
        : ('ready' as const),
    rows: league?.members.map(toRow) ?? [],
    topCount: league?.topCount ?? 0,
    daysLeft: league === undefined ? 0 : leagueDaysLeft(league.endsAt, now),
    retry: () => void query.refetch(),
  };
}
