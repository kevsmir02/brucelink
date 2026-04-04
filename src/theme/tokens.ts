export const THEME_TOKENS = {
  light: {
    colors: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceAlt: '#EEF2F7',
      text: '#0F172A',
      textMuted: '#475569',
      primary: '#EA580C',
      primaryStrong: '#C2410C',
      accent: '#2563EB',
      success: '#16A34A',
      warning: '#D97706',
      error: '#DC2626',
      border: '#CBD5E1',
      borderStrong: '#94A3B8',
      focus: '#1D4ED8',
      overlay: 'rgba(15, 23, 42, 0.5)',
    },
    typography: {
      regular: 'sans-serif',
      mono: 'monospace',
      pixel: 'PressStart2P-Regular',
      monoSize: 13,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      xxl: 32,
      xxxl: 40,
      jumbo: 48,
    },
    radius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
    },
  },
} as const;

export type ThemeMode = keyof typeof THEME_TOKENS;
