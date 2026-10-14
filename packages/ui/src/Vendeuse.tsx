import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { colors } from './tokens';

/** La vendeuse du marché, style « Grosse tête », reprise de la maquette. */
const VENDEUSE_SVG = {
  parle:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240"><ellipse cx="100" cy="234" rx="44" ry="5" fill="#211D18" fill-opacity="0.1"/><path d="M74 182L58 210" stroke="#6B3F26" stroke-width="12" stroke-linecap="round"/><path d="M126 176Q154 164 160 138" fill="none" stroke="#6B3F26" stroke-width="12" stroke-linecap="round"/><path d="M64 232Q64 162 100 152Q136 162 136 232Z" fill="#2F5BB7"/><circle cx="88" cy="192" r="6" fill="#F2B33D"/><circle cx="114" cy="210" r="6" fill="#F2B33D"/><circle cx="104" cy="176" r="4" fill="#E0583A"/><circle cx="80" cy="220" r="4" fill="#E0583A"/><path d="M70 196C88 202 112 202 132 194" fill="none" stroke="#FDF1D8" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="100" cy="96" r="54" fill="#6B3F26"/><circle cx="47" cy="116" r="9" fill="none" stroke="#F2B33D" stroke-width="3.5"/><circle cx="153" cy="116" r="9" fill="none" stroke="#F2B33D" stroke-width="3.5"/><ellipse cx="84" cy="26" rx="16" ry="11" fill="#E0583A" transform="rotate(-25 84 26)"/><ellipse cx="116" cy="26" rx="16" ry="11" fill="#E0583A" transform="rotate(25 116 26)"/><path d="M46 88Q40 32 100 28Q160 32 154 88Q100 64 46 88Z" fill="#E0583A"/><path d="M47 82Q100 58 153 82L154 90Q100 66 46 90Z" fill="#F2B33D"/><circle cx="74" cy="52" r="3" fill="#FDF1D8"/><circle cx="100" cy="44" r="3" fill="#FDF1D8"/><circle cx="126" cy="52" r="3" fill="#FDF1D8"/><circle cx="112" cy="62" r="3" fill="#FDF1D8"/><circle cx="88" cy="62" r="3" fill="#FDF1D8"/><path d="M70 97Q80 91 90 97M110 97Q120 91 130 97" fill="none" stroke="#2B170C" stroke-width="3" stroke-linecap="round"/><ellipse cx="80" cy="112" rx="11" ry="13" fill="#FFFFFF"/><ellipse cx="120" cy="112" rx="11" ry="13" fill="#FFFFFF"/><circle cx="82" cy="114" r="7" fill="#211D18"/><circle cx="122" cy="114" r="7" fill="#211D18"/><circle cx="85" cy="110" r="2.4" fill="#FFFFFF"/><circle cx="125" cy="110" r="2.4" fill="#FFFFFF"/><path d="M98 120Q96 126 102 126" fill="none" stroke="#4A2A18" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="64" cy="130" rx="8" ry="5" fill="#B5634A"/><ellipse cx="136" cy="130" rx="8" ry="5" fill="#B5634A"/><path d="M86 132Q100 148 114 132Z" fill="#FFFFFF" stroke="#2B170C" stroke-width="2.5" stroke-linejoin="round"/><path d="M150 154L164 158" stroke="#F2B33D" stroke-width="4" stroke-linecap="round"/><circle cx="161" cy="131" r="9" fill="#6B3F26"/></svg>',
  avatar:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 12 140 140"><circle cx="100" cy="96" r="54" fill="#6B3F26"/><circle cx="47" cy="116" r="9" fill="none" stroke="#F2B33D" stroke-width="3.5"/><circle cx="153" cy="116" r="9" fill="none" stroke="#F2B33D" stroke-width="3.5"/><ellipse cx="84" cy="26" rx="16" ry="11" fill="#E0583A" transform="rotate(-25 84 26)"/><ellipse cx="116" cy="26" rx="16" ry="11" fill="#E0583A" transform="rotate(25 116 26)"/><path d="M46 88Q40 32 100 28Q160 32 154 88Q100 64 46 88Z" fill="#E0583A"/><path d="M47 82Q100 58 153 82L154 90Q100 66 46 90Z" fill="#F2B33D"/><circle cx="74" cy="52" r="3" fill="#FDF1D8"/><circle cx="100" cy="44" r="3" fill="#FDF1D8"/><circle cx="126" cy="52" r="3" fill="#FDF1D8"/><path d="M70 97Q80 91 90 97M110 97Q120 91 130 97" fill="none" stroke="#2B170C" stroke-width="3" stroke-linecap="round"/><ellipse cx="80" cy="112" rx="11" ry="13" fill="#FFFFFF"/><ellipse cx="120" cy="112" rx="11" ry="13" fill="#FFFFFF"/><circle cx="82" cy="114" r="7" fill="#211D18"/><circle cx="122" cy="114" r="7" fill="#211D18"/><circle cx="85" cy="110" r="2.4" fill="#FFFFFF"/><circle cx="125" cy="110" r="2.4" fill="#FFFFFF"/><ellipse cx="64" cy="130" rx="8" ry="5" fill="#B5634A"/><ellipse cx="136" cy="130" rx="8" ry="5" fill="#B5634A"/><path d="M86 132Q100 148 114 132Z" fill="#FFFFFF" stroke="#2B170C" stroke-width="2.5" stroke-linejoin="round"/></svg>',
} as const;

export type VendeusePose = keyof typeof VENDEUSE_SVG;

export interface VendeuseProps {
  pose?: VendeusePose;
  /** Largeur ; la pose « parle » est 1,2 fois plus haute que large. */
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Vendeuse({ pose = 'parle', size = 104, accessibilityLabel, style }: VendeuseProps) {
  const avatar = pose === 'avatar';
  const height = avatar ? size : Math.round(size * 1.2);
  return (
    <View
      accessible={accessibilityLabel !== undefined}
      accessibilityRole={accessibilityLabel !== undefined ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel !== undefined ? 'yes' : 'no-hide-descendants'}
      style={[
        {
          width: size,
          height,
          borderRadius: avatar ? size / 2 : 0,
          backgroundColor: avatar ? colors.redLight : 'transparent',
          overflow: 'hidden',
        },
        style,
      ]}>
      <SvgXml xml={VENDEUSE_SVG[pose]} width={size} height={height} />
    </View>
  );
}
