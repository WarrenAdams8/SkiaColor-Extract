export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface PaletteColor {
  rgb: RGB;
  hsl: HSL;
  hex: string;
  population: number; // How many pixels this color represents
  score: number; // Combined score for ranking
  isVibrant: boolean;
  isDark: boolean;
  isLight: boolean;
}

export interface Palette {
  dominant: PaletteColor;
  vibrant: PaletteColor | null;
  muted: PaletteColor | null;
  darkVibrant: PaletteColor | null;
  lightVibrant: PaletteColor | null;
  allColors: PaletteColor[];
}

export interface ProcessingState {
  status: 'idle' | 'loading_skia' | 'processing' | 'error' | 'success';
  message?: string;
  duration?: number; // Duration in milliseconds
}