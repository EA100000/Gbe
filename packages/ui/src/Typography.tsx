import type { ReactNode } from 'react';
import { Platform, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts } from './tokens';

type Weight = 'regular' | 'semibold' | 'bold' | 'extrabold';

/** Sur le web, l'attribut lang="fon" aide navigateurs et lecteurs d'écran. */
const webLangFon: Record<string, string> = Platform.OS === 'web' ? { lang: 'fon' } : {};

export interface UiTextProps extends TextProps {
  size?: number;
  weight?: Weight;
  color?: string;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}

/** Texte d'interface (français), police Bricolage Grotesque. */
export function UiText({
  size = 16,
  weight = 'regular',
  color = colors.ink,
  style,
  ...rest
}: UiTextProps) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fonts.ui[weight], fontSize: size, color, lineHeight: size * 1.3 },
        style,
      ]}
    />
  );
}

export interface FonTextProps extends TextProps {
  size?: number;
  bold?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}

/** Texte en fon : police Andika, langue déclarée. Ne jamais afficher du fon sans ce composant. */
export function FonText({
  size = 18,
  bold = true,
  color = colors.ink,
  style,
  ...rest
}: FonTextProps) {
  return (
    <Text
      {...webLangFon}
      {...rest}
      style={[
        {
          fontFamily: bold ? fonts.fon.bold : fonts.fon.regular,
          fontSize: size,
          color,
          lineHeight: size * 1.35,
        },
        style,
      ]}
    />
  );
}

/** Morceau de texte mixte : français ou fon. */
export type RichSegment = { fr: string } | { fon: string };

export interface RichTextProps {
  segments: readonly RichSegment[];
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** Affiche une phrase française qui contient des mots en fon (ex. « sɔ veut dire hier »). */
export function RichText({ segments, size = 15, color = colors.ink, style }: RichTextProps) {
  return (
    <UiText size={size} color={color} style={style}>
      {segments.map((segment, i) =>
        'fon' in segment ? (
          <FonText key={i} size={size} color={color}>
            {segment.fon}
          </FonText>
        ) : (
          <Text key={i}>{segment.fr}</Text>
        ),
      )}
    </UiText>
  );
}
