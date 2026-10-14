import { SvgXml } from 'react-native-svg';

import { colors } from './tokens';

/** Décors de la maquette (chemin, histoire, fin de leçon). Toujours décoratifs. */
const SUN_POINTS =
  '96,50 81.9,58.5 89.8,73 73.3,73.3 73,89.8 58.5,81.9 50,96 41.5,81.9 27,89.8 26.7,73.3 10.2,73 18.1,58.5 4,50 18.1,41.5 10.2,27 26.7,26.7 27,10.2 41.5,18.1 50,4 58.5,18.1 73,10.2 73.3,26.7 89.8,27 81.9,41.5';

const fish = (x: number, y: number, s: number, tail: string, body: string, eye: string) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><polygon points="70,50 96,30 90,50 96,70" fill="${tail}"/><path d="M6 50Q38 18 74 50Q38 82 6 50Z" fill="${body}"/><circle cx="22" cy="46" r="4" fill="${eye}"/></g>`;

const ILLUSTRATIONS = {
  palm: {
    viewBox: '0 0 86 104',
    body: `<ellipse cx="42" cy="98" rx="30" ry="5" fill="${colors.borderSoft}"/><path d="M44 98C42 76 46 56 40 36" fill="none" stroke="${colors.yellowText}" stroke-width="7" stroke-linecap="round"/><path d="M40 86h7M41 74h7M42 62h7M41 50h6" stroke="${colors.yellowShadow}" stroke-width="2"/><path d="M40 36C28 22 12 22 4 30C16 28 28 32 40 38Z" fill="${colors.green}"/><path d="M40 36C34 18 22 8 12 8C22 16 30 26 38 38Z" fill="${colors.greenDark}"/><path d="M40 36C48 18 62 10 74 12C62 18 52 26 42 38Z" fill="${colors.green}"/><path d="M40 36C56 28 72 32 82 42C68 38 54 38 42 38Z" fill="${colors.greenDark}"/><path d="M40 36C38 48 30 58 20 62C26 52 32 44 38 36Z" fill="${colors.green}"/><circle cx="36" cy="42" r="4" fill="${colors.brown}"/><circle cx="44" cy="43" r="4" fill="${colors.brown}"/>`,
  },
  hut: {
    viewBox: '0 0 100 100',
    body: `<ellipse cx="50" cy="92" rx="40" ry="5" fill="${colors.borderSoft}"/><rect x="24" y="50" width="52" height="40" fill="${colors.red}"/><path d="M24 70h52" stroke="${colors.redDark}" stroke-width="2" stroke-dasharray="3 3"/><polygon points="10,56 50,12 90,56" fill="${colors.yellow}"/><path d="M30 44L26 56M42 30L38 56M58 30L62 56M70 44L74 56" stroke="${colors.yellowShadow}" stroke-width="3"/><rect x="43" y="64" width="14" height="26" rx="7" fill="${colors.ink}"/><circle cx="33" cy="64" r="4" fill="${colors.cream}"/>`,
  },
  calebasseLocked: {
    viewBox: '0 0 100 100',
    body: `<path d="M12 56 Q12 94 50 94 Q88 94 88 56 Z" fill="${colors.lockedShadow}"/><rect x="12" y="50" width="76" height="8" fill="${colors.lockedIcon}"/><path d="M14 50 Q50 18 86 50 Z" fill="${colors.locked}"/><circle cx="50" cy="30" r="5" fill="${colors.lockedIcon}"/>`,
  },
  calebasseOpen: {
    viewBox: '0 0 100 100',
    body: `<path d="M12 56 Q12 94 50 94 Q88 94 88 56 Z" fill="${colors.yellow}"/><path d="M18 72Q50 98 82 72" fill="none" stroke="${colors.red}" stroke-width="4"/><rect x="12" y="50" width="76" height="8" fill="${colors.yellowShadow}"/><path d="M20 40 Q52 6 88 30 Z" fill="${colors.yellowSoft}"/><g transform="translate(40 46) rotate(-10)"><ellipse rx="6" ry="8" fill="${colors.cream}" stroke="${colors.yellowShadow}" stroke-width="1.6"/></g><g transform="translate(58 44) rotate(12)"><ellipse rx="6" ry="8" fill="${colors.cream}" stroke="${colors.yellowShadow}" stroke-width="1.6"/></g>`,
  },
  confetti: {
    viewBox: '0 0 390 230',
    body: `<polygon points="62,40 80,30 74,52" fill="${colors.yellow}"/><circle cx="104" cy="96" r="7" fill="${colors.red}"/><rect x="48" y="150" width="14" height="14" fill="${colors.blue}" transform="rotate(20 55 157)"/><polygon points="300,34 322,44 302,58" fill="${colors.red}"/><circle cx="286" cy="110" r="6" fill="${colors.yellow}"/><rect x="322" y="150" width="14" height="14" fill="${colors.blue}" transform="rotate(-24 329 157)"/><circle cx="150" cy="22" r="5" fill="${colors.blue}"/><polygon points="246,12 262,20 248,30" fill="${colors.yellow}"/><g transform="translate(92 200) rotate(-24)"><ellipse rx="8" ry="11" fill="${colors.yellow}"/><path d="M0 -7 V7" stroke="${colors.ink}" stroke-width="2"/></g><g transform="translate(300 206) rotate(18)"><ellipse rx="8" ry="11" fill="${colors.yellow}"/><path d="M0 -7 V7" stroke="${colors.ink}" stroke-width="2"/></g>`,
  },
  bannerDots: {
    viewBox: '0 0 160 110',
    body: `<circle cx="128" cy="22" r="28" fill="${colors.yellowSoft}"/><circle cx="128" cy="22" r="15" fill="${colors.yellow}"/><circle cx="128" cy="22" r="6" fill="${colors.yellowMid}"/><circle cx="78" cy="98" r="24" fill="${colors.yellowSoft}"/><circle cx="78" cy="98" r="10" fill="${colors.yellowMid}"/><circle cx="156" cy="92" r="18" fill="${colors.yellowSoft}"/><circle cx="46" cy="14" r="5" fill="${colors.yellowMid}"/><circle cx="104" cy="60" r="4" fill="${colors.yellowMid}"/><polygon points="20,70 30,54 40,70" fill="${colors.yellowSoft}"/>`,
  },
  kente: {
    viewBox: '0 0 390 14',
    body: Array.from(
      { length: 17 },
      (_, i) =>
        `<rect x="${i * 24}" width="24" height="14" fill="${colors.red}"/><polygon points="${i * 24},14 ${i * 24 + 12},0 ${i * 24 + 24},14" fill="${colors.yellow}"/>`,
    ).join(''),
  },
  market: {
    viewBox: '0 0 358 156',
    body: `<g transform="translate(300 6) scale(0.44)"><polygon points="${SUN_POINTS}" fill="${colors.yellow}"/><circle cx="50" cy="50" r="24" fill="${colors.red}"/></g><rect x="0" y="146" width="358" height="10" fill="${colors.yellowLine}"/><path d="M112 40V150" stroke="${colors.yellowText}" stroke-width="4" stroke-linecap="round"/><path d="M22 48Q112 -12 202 48Z" fill="${colors.red}"/><polygon points="112,10 50,48 76,48" fill="${colors.yellow}"/><polygon points="112,10 99,48 125,48" fill="${colors.yellow}"/><polygon points="112,10 148,48 174,48" fill="${colors.yellow}"/><rect x="22" y="46" width="180" height="6" fill="${colors.redDark}"/><path d="M22 52h180" stroke="${colors.cream}" stroke-width="1.4" stroke-dasharray="3 3"/><rect x="168" y="98" width="182" height="12" rx="3" fill="${colors.yellowText}"/><rect x="172" y="110" width="174" height="40" fill="${colors.blue}"/>${[
      196, 236, 276, 318,
    ]
      .map(
        (x, i) =>
          `<circle cx="${x}" cy="${[128, 136, 124, 136][i]}" r="7" fill="${colors.yellow}"/><circle cx="${x}" cy="${[128, 136, 124, 136][i]}" r="2.6" fill="${colors.red}"/>`,
      )
      .join(
        '',
      )}<ellipse cx="258" cy="94" rx="76" ry="12" fill="${colors.lockedIcon}"/><ellipse cx="258" cy="92" rx="70" ry="9" fill="${colors.locked}"/>${fish(206, 76, 0.36, colors.yellowShadow, colors.yellow, colors.ink)}${fish(240, 72, 0.4, colors.redDark, colors.red, colors.white)}${fish(278, 76, 0.36, colors.blueShadow, colors.blueSoft, colors.white)}`,
  },
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

export interface IllustrationProps {
  name: IllustrationName;
  width: number;
  height: number;
}

export function Illustration({ name, width, height }: IllustrationProps) {
  const { viewBox, body } = ILLUSTRATIONS[name];
  return (
    <SvgXml
      xml={`<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice">${body}</svg>`}
      width={width}
      height={height}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
