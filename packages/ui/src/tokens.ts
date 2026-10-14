/**
 * Couleurs de Gbè, relevées dans la maquette.
 * Les paires texte/fond utilisées dans l'appli respectent un contraste d'au moins 4,5:1.
 */
export const colors = {
  ink: '#211D18',
  inkMuted: '#5E554A',
  inkSoft: '#776D60',
  white: '#FFFFFF',
  border: '#E7E1D7',
  borderSoft: '#EFEAE2',
  surfaceMuted: '#F6F3EE',

  yellow: '#F2B33D',
  yellowShadow: '#C98A12',
  yellowHighlight: '#F8D58E',
  yellowSoft: '#F6C35F',
  yellowMid: '#E9A52A',
  yellowLine: '#F2D08A',
  cream: '#FDF1D8',
  yellowText: '#9A6408',
  yellowDeep: '#3D2A05',

  blue: '#2F5BB7',
  blueShadow: '#1F3F86',
  blueLight: '#E4ECFA',
  blueSoft: '#5B82D6',

  red: '#E0583A',
  redDark: '#B83F24',
  redShadow: '#8A2D18',
  redLight: '#FCE7E1',
  redText: '#A3341C',

  locked: '#E7E1D7',
  lockedShadow: '#CFC7BA',
  lockedIcon: '#ADA395',
  lockedStroke: '#9A9083',

  photo: '#2C261E',
  photoStripe: '#342D24',
  photoBadge: '#433A2F',
  photoText: '#F5EFE4',
  photoTextSoft: '#C9BFAF',

  green: '#4E9A5B',
  greenDark: '#3E7F4A',
  brown: '#6B3F26',
} as const;

export const radii = { sm: 12, md: 14, lg: 16, xl: 18 } as const;

/** Zone tactile minimale : 48 dp (Android) couvre aussi les 44 pt d'iOS. */
export const MIN_TOUCH = 48;

/**
 * Familles de polices chargées par l'appli.
 * Sur Android, la graisse d'une police personnalisée passe par la famille, pas par fontWeight.
 */
export const fonts = {
  ui: {
    regular: 'BricolageGrotesque_400Regular',
    semibold: 'BricolageGrotesque_600SemiBold',
    bold: 'BricolageGrotesque_700Bold',
    extrabold: 'BricolageGrotesque_800ExtraBold',
  },
  /** Andika affiche correctement ɖ, ɛ, ɔ et les tons combinés. */
  fon: {
    regular: 'Andika_400Regular',
    bold: 'Andika_700Bold',
  },
} as const;
