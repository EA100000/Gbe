import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { colors } from './tokens';

/** Dessins du Galet, repris de la maquette (composant « Mascotte »). */
const GALET_SVG = {
  parle:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path d="M126 34l9 -7M131 44l11 -3M128 54l10 2" stroke="#2F5BB7" stroke-width="3" stroke-linecap="round"/><ellipse cx="80" cy="150" rx="44" ry="5" fill="#211D18" fill-opacity="0.1"/><ellipse cx="62" cy="141" rx="13" ry="7" fill="#C98A12"/><ellipse cx="98" cy="141" rx="13" ry="7" fill="#C98A12"/><path d="M80 34C73 22 75 11 82 6C85 16 87 25 80 34Z" fill="#2F5BB7"/><path d="M77 36C66 31 61 23 63 16C70 21 75 28 77 36Z" fill="#1F3F86"/><path d="M83 36C90 27 98 24 104 26C99 32 92 36 83 36Z" fill="#1F3F86"/><circle cx="80" cy="86" r="56" fill="#F2B33D"/><circle cx="80" cy="86" r="50" fill="none" stroke="#E9A52A" stroke-width="1.6" stroke-dasharray="3 4"/><ellipse cx="80" cy="110" rx="32" ry="22" fill="#FDF1D8"/><ellipse cx="24" cy="100" rx="9" ry="15" fill="#E9A52A" transform="rotate(20 24 100)"/><ellipse cx="140" cy="72" rx="9" ry="15" fill="#E9A52A" transform="rotate(40 140 72)"/><ellipse cx="62" cy="74" rx="13" ry="15" fill="#FFFFFF"/><ellipse cx="98" cy="74" rx="13" ry="15" fill="#FFFFFF"/><circle cx="64" cy="77" r="7.5" fill="#211D18"/><circle cx="100" cy="77" r="7.5" fill="#211D18"/><circle cx="67" cy="73" r="2.6" fill="#FFFFFF"/><circle cx="103" cy="73" r="2.6" fill="#FFFFFF"/><ellipse cx="45" cy="94" rx="7" ry="4.5" fill="#E98C74"/><ellipse cx="115" cy="94" rx="7" ry="4.5" fill="#E98C74"/><ellipse cx="80" cy="101" rx="8" ry="6.5" fill="#B83F24"/><ellipse cx="80" cy="104" rx="4.5" ry="2.5" fill="#E98C74"/></svg>',
  content:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path d="M22 26l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#2F5BB7"/><path d="M140 22l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#E0583A"/><ellipse cx="80" cy="150" rx="44" ry="5" fill="#211D18" fill-opacity="0.1"/><ellipse cx="62" cy="141" rx="13" ry="7" fill="#C98A12"/><ellipse cx="98" cy="141" rx="13" ry="7" fill="#C98A12"/><path d="M80 34C73 22 75 11 82 6C85 16 87 25 80 34Z" fill="#2F5BB7"/><path d="M77 36C66 31 61 23 63 16C70 21 75 28 77 36Z" fill="#1F3F86"/><path d="M83 36C90 27 98 24 104 26C99 32 92 36 83 36Z" fill="#1F3F86"/><circle cx="80" cy="86" r="56" fill="#F2B33D"/><circle cx="80" cy="86" r="50" fill="none" stroke="#E9A52A" stroke-width="1.6" stroke-dasharray="3 4"/><ellipse cx="80" cy="110" rx="32" ry="22" fill="#FDF1D8"/><ellipse cx="22" cy="62" rx="9" ry="15" fill="#E9A52A" transform="rotate(-35 22 62)"/><ellipse cx="138" cy="62" rx="9" ry="15" fill="#E9A52A" transform="rotate(35 138 62)"/><path d="M50 78Q62 64 74 78" fill="none" stroke="#211D18" stroke-width="4.5" stroke-linecap="round"/><path d="M86 78Q98 64 110 78" fill="none" stroke="#211D18" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="45" cy="94" rx="8" ry="5" fill="#E98C74"/><ellipse cx="115" cy="94" rx="8" ry="5" fill="#E98C74"/><path d="M66 94Q80 120 94 94Z" fill="#B83F24"/><ellipse cx="80" cy="106" rx="7" ry="4" fill="#E98C74"/></svg>',
  triste:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><ellipse cx="80" cy="150" rx="44" ry="5" fill="#211D18" fill-opacity="0.1"/><ellipse cx="62" cy="141" rx="13" ry="7" fill="#C98A12"/><ellipse cx="98" cy="141" rx="13" ry="7" fill="#C98A12"/><path d="M78 36C70 28 70 18 74 12C78 20 82 26 78 36Z" fill="#2F5BB7"/><path d="M75 38C64 36 58 30 58 24C66 28 72 32 75 38Z" fill="#1F3F86"/><path d="M83 37C90 32 98 32 102 36C96 38 90 39 83 37Z" fill="#1F3F86"/><circle cx="80" cy="88" r="55" fill="#F2B33D"/><circle cx="80" cy="88" r="49" fill="none" stroke="#E9A52A" stroke-width="1.6" stroke-dasharray="3 4"/><ellipse cx="80" cy="112" rx="32" ry="21" fill="#FDF1D8"/><ellipse cx="28" cy="108" rx="9" ry="15" fill="#E9A52A" transform="rotate(8 28 108)"/><ellipse cx="132" cy="108" rx="9" ry="15" fill="#E9A52A" transform="rotate(-8 132 108)"/><ellipse cx="62" cy="78" rx="13" ry="15" fill="#FFFFFF"/><ellipse cx="98" cy="78" rx="13" ry="15" fill="#FFFFFF"/><circle cx="63" cy="84" r="7" fill="#211D18"/><circle cx="97" cy="84" r="7" fill="#211D18"/><circle cx="65" cy="81" r="2.2" fill="#FFFFFF"/><circle cx="99" cy="81" r="2.2" fill="#FFFFFF"/><path d="M49 78A13 15 0 0 1 75 78Z" fill="#F2B33D"/><path d="M85 78A13 15 0 0 1 111 78Z" fill="#F2B33D"/><path d="M50 64L72 58M110 64L88 58" stroke="#9A6408" stroke-width="3.5" stroke-linecap="round"/><path d="M70 106Q80 96 90 106" fill="none" stroke="#211D18" stroke-width="3.5" stroke-linecap="round"/><path d="M50 96C50 96 46 102 46 105A4 4 0 0 0 54 105C54 102 50 96 50 96Z" fill="#5B82D6"/></svg>',
  fete: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><polygon points="12,30 26,22 24,38" fill="#E0583A"/><circle cx="40" cy="14" r="4" fill="#2F5BB7"/><rect x="116" y="10" width="9" height="9" fill="#2F5BB7" transform="rotate(20 120 14)"/><polygon points="138,30 152,26 148,42" fill="#E0583A"/><circle cx="150" cy="108" r="4" fill="#2F5BB7"/><circle cx="10" cy="104" r="3.5" fill="#E0583A"/><path d="M8 72l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#2F5BB7"/><ellipse cx="80" cy="150" rx="44" ry="5" fill="#211D18" fill-opacity="0.1"/><ellipse cx="60" cy="140" rx="13" ry="7" fill="#C98A12" transform="rotate(-12 60 140)"/><ellipse cx="100" cy="140" rx="13" ry="7" fill="#C98A12" transform="rotate(12 100 140)"/><path d="M80 32C72 20 74 9 82 4C85 14 87 23 80 32Z" fill="#2F5BB7"/><path d="M77 34C65 30 59 21 61 13C68 19 74 26 77 34Z" fill="#1F3F86"/><path d="M83 34C91 24 99 21 106 23C100 30 92 34 83 34Z" fill="#1F3F86"/><circle cx="80" cy="84" r="56" fill="#F2B33D"/><circle cx="80" cy="84" r="50" fill="none" stroke="#E9A52A" stroke-width="1.6" stroke-dasharray="3 4"/><ellipse cx="80" cy="108" rx="32" ry="22" fill="#FDF1D8"/><ellipse cx="22" cy="50" rx="9" ry="16" fill="#E9A52A" transform="rotate(-25 22 50)"/><ellipse cx="138" cy="50" rx="9" ry="16" fill="#E9A52A" transform="rotate(25 138 50)"/><path d="M50 76Q62 62 74 76" fill="none" stroke="#211D18" stroke-width="4.5" stroke-linecap="round"/><path d="M86 76Q98 62 110 76" fill="none" stroke="#211D18" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="45" cy="92" rx="8" ry="5" fill="#E98C74"/><ellipse cx="115" cy="92" rx="8" ry="5" fill="#E98C74"/><path d="M62 90Q80 124 98 90Z" fill="#B83F24"/><ellipse cx="80" cy="106" rx="9" ry="5" fill="#E98C74"/></svg>',
  avatar:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="14 2 132 132"><path d="M80 34C73 22 75 11 82 6C85 16 87 25 80 34Z" fill="#2F5BB7"/><path d="M77 36C66 31 61 23 63 16C70 21 75 28 77 36Z" fill="#1F3F86"/><path d="M83 36C90 27 98 24 104 26C99 32 92 36 83 36Z" fill="#1F3F86"/><circle cx="80" cy="86" r="56" fill="#F2B33D"/><ellipse cx="80" cy="110" rx="32" ry="22" fill="#FDF1D8"/><ellipse cx="62" cy="74" rx="13" ry="15" fill="#FFFFFF"/><ellipse cx="98" cy="74" rx="13" ry="15" fill="#FFFFFF"/><circle cx="64" cy="77" r="7.5" fill="#211D18"/><circle cx="100" cy="77" r="7.5" fill="#211D18"/><circle cx="67" cy="73" r="2.6" fill="#FFFFFF"/><circle cx="103" cy="73" r="2.6" fill="#FFFFFF"/><ellipse cx="45" cy="94" rx="7" ry="4.5" fill="#E98C74"/><ellipse cx="115" cy="94" rx="7" ry="4.5" fill="#E98C74"/><path d="M70 97Q80 107 90 97" fill="none" stroke="#211D18" stroke-width="3.5" stroke-linecap="round"/></svg>',
} as const;

export type GaletPose = keyof typeof GALET_SVG;

export interface GaletProps {
  pose?: GaletPose;
  size?: number;
  /** Retourne le dessin (regard vers la gauche). */
  flip?: boolean;
  /**
   * Description pour les lecteurs d'écran. Sans libellé, le dessin est décoratif
   * et ignoré par l'accessibilité.
   */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Gbè, la mascotte « Galet ». */
export function Galet({
  pose = 'parle',
  size = 160,
  flip = false,
  accessibilityLabel,
  style,
}: GaletProps) {
  const avatar = pose === 'avatar';
  return (
    <View
      accessible={accessibilityLabel !== undefined}
      accessibilityRole={accessibilityLabel !== undefined ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel !== undefined ? 'yes' : 'no-hide-descendants'}
      style={[
        {
          width: size,
          height: size,
          borderRadius: avatar ? size / 2 : 0,
          backgroundColor: avatar ? colors.blueLight : 'transparent',
          overflow: 'hidden',
          transform: flip ? [{ scaleX: -1 }] : undefined,
        },
        style,
      ]}>
      <SvgXml xml={GALET_SVG[pose]} width={size} height={size} />
    </View>
  );
}
