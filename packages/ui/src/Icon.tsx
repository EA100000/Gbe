import { SvgXml } from 'react-native-svg';

import { colors } from './tokens';

/**
 * Icônes de la maquette. `currentColor` prend la couleur passée en propriété.
 * Les icônes sont décoratives : le bouton qui les contient porte le libellé.
 */
const STAR_POINTS =
  '12,2.8 14.7,8.6 21,9.2 16.2,13.4 17.6,19.7 12,16.4 6.4,19.7 7.8,13.4 3,9.2 9.3,8.6';
const SUN_POINTS =
  '96,50 81.9,58.5 89.8,73 73.3,73.3 73,89.8 58.5,81.9 50,96 41.5,81.9 27,89.8 26.7,73.3 10.2,73 18.1,58.5 4,50 18.1,41.5 10.2,27 26.7,26.7 27,10.2 41.5,18.1 50,4 58.5,18.1 73,10.2 73.3,26.7 89.8,27 81.9,41.5';
const stroke = (d: string, width = 2.2) =>
  `<svg viewBox="0 0 24 24"><path d="${d}" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const ICONS = {
  close: stroke('M6 6l12 12M18 6L6 18', 2.6),
  check: stroke('M5 12.5l4.5 4.5L19 7.5', 3.2),
  chevronRight: stroke('M9 5l7 7-7 7', 2.4),
  book: stroke('M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4zM5 16a4 4 0 0 1 4-4h10'),
  trophy: stroke(
    'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5.5a2.5 2.5 0 0 0 2.5 4M16 6h2.5a2.5 2.5 0 0 1-2.5 4M12 13v4M8.5 20h7',
  ),
  refresh: stroke('M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5', 2.4),
  tabPath: stroke('M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5').replace(
    '</svg>',
    '<circle cx="6" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="18" cy="6" r="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  ),
  tabSounds: stroke('M4 10v4M8 7v10M12 4v16M16 8v8M20 10.5v3'),
  tabLeague: stroke(
    'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5.5a2.5 2.5 0 0 0 2.5 4M16 6h2.5a2.5 2.5 0 0 1-2.5 4M12 13v4M8.5 20h7',
  ),
  tabProfile: stroke(
    'M5 20c1-3.8 3.8-5.5 7-5.5s6 1.7 7 5.5M15.5 8.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0',
  ),
  trash: stroke('M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6'),
  arrowUp: stroke('M12 19V5M6 11l6-6 6 6', 2.6),
  leagueShield: `<svg viewBox="0 0 24 26"><path d="M12 1l9 3.5v7c0 6-4 10-9 13-5-3-9-7-9-13v-7z" fill="${colors.yellow}" stroke="${colors.yellowShadow}" stroke-width="1.2"/><ellipse cx="12" cy="12" rx="4" ry="5.5" fill="${colors.white}"/><path d="M12 8v8M10.6 10h1.4M10.6 12h1.4M10.6 14h1.4M12 11h1.4M12 13h1.4" stroke="${colors.ink}" stroke-width="0.8" fill="none"/></svg>`,
  shield: stroke('M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6zM9 12l2 2 4-4'),
  chevronLeft: stroke('M15 5l-7 7 7 7', 2.6),
  bell: stroke('M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 21a2 2 0 0 0 4 0'),
  bellOff: stroke('M6 16.5V11a6 6 0 0 1 9.2-5M18 11v5.5l1.5 2H8M10 21a2 2 0 0 0 4 0M3.5 3.5l17 17'),
  sunrise: stroke(
    'M3 19h18M7 15a5 5 0 0 1 10 0M12 4v5M9.5 6.5L12 4l2.5 2.5M4.5 11l1.5 1M19.5 11l-1.5 1',
  ),
  sun: stroke(
    'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  ),
  sunset: stroke(
    'M3 19h18M7 15a5 5 0 0 1 10 0M12 4v5M9.5 6.5L12 9l2.5-2.5M4.5 11l1.5 1M19.5 11l-1.5 1',
  ),
  moon: stroke('M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'),
  clockLine: stroke('M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 2'),
  key: stroke('M11.5 11.5L20 3M16.5 6.5l3 3M14 9l2 2').replace(
    '</svg>',
    '<circle cx="8" cy="15" r="4.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  ),
  copy: stroke(
    'M9 11.5A2.5 2.5 0 0 1 11.5 9h7a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 9 18.5zM15 9V5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15H9',
  ),
  pencil: stroke('M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4'),
  warning: stroke('M12 3.5l9.5 16.5h-19zM12 10v4.5M12 17.2v.01', 2.4),
  offline: stroke(
    'M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.8a10 10 0 0 1 4.6-2.5M14.6 10.3a10 10 0 0 1 4.4 2.5M2 9a15 15 0 0 1 4.3-2.7M10.5 5.1A15 15 0 0 1 22 9M12 20v.01',
    2.4,
  ),
  speaker:
    '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></g></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  info: '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.5"/></g></svg>',
  star: `<svg viewBox="0 0 24 24"><polygon points="${STAR_POINTS}" fill="currentColor"/></svg>`,
  sparkle:
    '<svg viewBox="0 0 24 24"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z" fill="currentColor"/></svg>',
  heart: `<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.4A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z" fill="${colors.red}"/></svg>`,
  flame: `<svg viewBox="0 0 24 24"><path d="M12 2.5c1.2 3.6 5.5 5.8 5.5 10.6A5.5 5.5 0 0 1 6.5 13c0-2.7 1.6-4.4 2.7-5.4.3 1.8 1.3 2.8 2.2 3.1C11 8.2 10.8 5.2 12 2.5z" fill="${colors.red}"/><path d="M12 13c.7 1.3 2.2 2 2.2 3.8a2.2 2.2 0 0 1-4.4 0c0-1 .6-1.6 1-2 .1.6.5 1 .9 1.1-.2-1-.1-2 .3-2.9z" fill="${colors.yellow}"/></svg>`,
  cauris: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7.5" ry="10" fill="${colors.yellow}"/><path d="M12 5v14M9.6 8h2.4M9.6 11h2.4M9.6 14h2.4M12 9.5h2.4M12 12.5h2.4M12 15.5h2.4" stroke="${colors.ink}" stroke-width="1.4" fill="none"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24"><path d="M13.5 2L4 14h7l-1.5 8L20 10h-7z" fill="${colors.yellow}"/></svg>`,
  target: `<svg viewBox="0 0 24 24"><g fill="none" stroke="${colors.blue}" stroke-width="2.4"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/></g></svg>`,
  clock: `<svg viewBox="0 0 24 24"><g fill="none" stroke="${colors.redDark}" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></g></svg>`,
  courseFon: `<svg viewBox="0 0 100 100"><polygon points="${SUN_POINTS}" fill="${colors.yellow}"/><circle cx="50" cy="50" r="25" fill="${colors.red}"/><circle cx="50" cy="50" r="11" fill="${colors.white}"/></svg>`,
  waveform: `<svg viewBox="0 0 132 28">${[
    [0, 11, 6],
    [7, 7, 14],
    [14, 3, 22],
    [21, 8, 12],
    [28, 1, 26],
    [35, 6, 16],
    [42, 10, 8],
    [49, 4, 20],
    [56, 9, 10],
    [63, 2, 24],
    [70, 7, 14],
    [77, 11, 6],
    [84, 5, 18],
    [91, 9, 10],
    [98, 3, 22],
    [105, 8, 12],
    [112, 11, 6],
    [119, 9, 10],
    [126, 12, 4],
  ]
    .map(
      ([x, y, h]) =>
        `<rect x="${x}" y="${y}" width="3" height="${h}" rx="1.5" fill="currentColor"/>`,
    )
    .join('')}</svg>`,
  funFact: `<svg viewBox="0 0 100 100"><circle cx="46" cy="52" r="38" fill="${colors.yellow}"/><circle cx="62" cy="42" r="33" fill="${colors.white}"/><circle cx="80" cy="74" r="5" fill="${colors.blue}"/></svg>`,
} as const;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Largeur différente de la hauteur (forme d'onde). */
  width?: number;
}

export function Icon({ name, size = 24, color = colors.ink, width }: IconProps) {
  return (
    <SvgXml
      xml={ICONS[name]}
      width={width ?? size}
      height={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
