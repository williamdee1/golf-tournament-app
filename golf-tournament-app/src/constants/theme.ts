// Golf Tournament App — Design Token Reference
// Use these constants when adding new screens or components
// to keep the visual language consistent.

export const Colors = {
  // Greens
  greenDark:    '#1b5e20', // headers, primary actions
  greenPrimary: '#2e7d32', // buttons, accent bars, active states
  greenLight:   '#a5d6a7', // on-dark muted text, check marks
  greenSurface: '#e8f5e9', // chip/badge backgrounds
  greenBg:      '#f2f5f2', // screen backgrounds

  // Semantic
  danger:       '#c62828', // delete, destructive actions
  info:         '#1565c0', // edit, info links
  points:       '#7b1fa2', // Stableford points (purple)
  birdie:       '#e64a19', // birdie highlights (orange)

  // Score colours (GroupScorecard / CourseScorecard)
  scoreEagle:   '#7b1fa2', // eagle or better — purple
  scoreBirdie:  '#c62828', // birdie — red
  scorePar:     '#ffffff', // par — white
  scoreBogey:   '#1565c0', // bogey — blue
  scoreDouble:  '#0d47a1', // double bogey+ — dark blue

  // Neutrals
  n900: '#1a1a1a',
  n700: '#444444',
  n500: '#888888',
  n300: '#cccccc',
  n100: '#f5f5f5',
  white: '#ffffff',
};

// Typography scale — 7 sizes
export const FontSize = {
  xs:   12,
  sm:   14,
  md:   16,
  lg:   20,
  xl:   24,
  xxl:  30,
  hero: 32,
};

// Spacing — 4px base unit
export const Space = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

// Border radii
export const Radius = {
  sm:   8,
  md:   12,
  lg:   14,
  pill: 20,
  full: 999,
};

// Standard card shadow
export const CardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 2,
};

// Standard header padding (accounts for status bar on web)
export const HeaderPadding = {
  paddingHorizontal: Space.xl,
  paddingTop: 52,
  paddingBottom: 28,
};
