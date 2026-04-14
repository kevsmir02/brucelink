import { THEME_TOKENS, type ThemeMode } from '../theme/tokens';

export type ThemePreference = 'light' | 'dark' | 'system';

function toPalette(mode: ThemeMode) {
  const theme = THEME_TOKENS[mode];
  return {
    background: theme.colors.background,
    surface: theme.colors.surface,
    surfaceAlt: theme.colors.surfaceAlt,
    primary: theme.colors.primary,
    primaryDim: theme.colors.primaryStrong,
    accent: theme.colors.accent,
    text: theme.colors.text,
    textMuted: theme.colors.textMuted,
    error: theme.colors.error,
    errorDim: theme.colors.error,
    border: theme.colors.border,
    borderLight: theme.colors.borderStrong,
    warning: theme.colors.warning,
    overlay: theme.colors.overlay,
  };
}

export function resolveThemeMode(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | 'unspecified' | null,
): ThemeMode {
  if (preference === 'system') {
    return systemScheme === 'light' ? 'light' : 'dark';
  }
  return preference;
}

let activeTheme: ThemeMode = 'dark';

export const COLORS = {
  ...toPalette(activeTheme),
};

export function applyThemeMode(mode: ThemeMode) {
  activeTheme = mode;
  Object.assign(COLORS, toPalette(mode));
}

export function getActiveThemeMode(): ThemeMode {
  return activeTheme;
}

export const FONTS = {
  mono: THEME_TOKENS.light.typography.mono,
  monoSize: THEME_TOKENS.light.typography.monoSize,
  regular: THEME_TOKENS.light.typography.regular,
  /** Press Start 2P (Android: linked via react-native.config.js + react-native-asset) */
  pixel: THEME_TOKENS.light.typography.pixel,
};

export const STORAGE_KEYS = {
  session: '@bruce_session',
  baseUrl: '@bruce_base_url',
  themeMode: '@bruce_theme_mode',
  lastFs: '@bruce_last_fs',
  lastPath: '@bruce_last_path',
};

export const DEFAULT_BASE_URL = 'http://172.0.0.1';
export const DEFAULT_USERNAME = 'admin';
export const DEFAULT_PASSWORD = 'bruce'; // Bruce firmware default (config.h: Credential webUI = {"admin", "bruce"})

// Maps file extensions to the CLI command sent to /cm to execute them.
// All strings verified against /src/core/serial_commands/*.cpp in the firmware repo.
export const EXECUTABLE_EXTENSIONS: Record<string, (path: string) => string> = {
  '.ir':  path => `ir tx_from_file "${path}"`,      // ir_commands.cpp: createIrTxFileCommand
  '.sub': path => `subghz tx_from_file "${path}"`, // rf_commands.cpp: createRfTxFileCommand
  '.js':  path => `js run_from_file "${path}"`,    // interpreter_commands.cpp
  '.bjs': path => `js run_from_file "${path}"`,    // interpreter_commands.cpp
  '.txt': path => `badusb run_from_file "${path}"`, // badusb_commands.cpp
  '.mp3': path => `play "${path}"`,                // sound_commands.cpp: createSoundCommands
  '.wav': path => `play "${path}"`,                // sound_commands.cpp: createSoundCommands
};

export const TEXT_EXTENSIONS = [
  '.txt', '.js', '.json', '.md', '.csv', '.log', '.cfg', '.ini',
  '.bjs', '.ir', '.sub', '.py', '.sh', '.bat', '.xml', '.html',
];
