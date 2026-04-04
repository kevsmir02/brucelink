import { THEME_TOKENS } from '../theme/tokens';

const lightTheme = THEME_TOKENS.light;

export const COLORS = {
  background: lightTheme.colors.background,
  surface: lightTheme.colors.surface,
  surfaceAlt: lightTheme.colors.surfaceAlt,
  primary: lightTheme.colors.primary,
  primaryDim: lightTheme.colors.primaryStrong,
  accent: lightTheme.colors.accent,
  text: lightTheme.colors.text,
  textMuted: lightTheme.colors.textMuted,
  error: lightTheme.colors.error,
  errorDim: lightTheme.colors.error,
  border: lightTheme.colors.border,
  borderLight: lightTheme.colors.borderStrong,
  warning: lightTheme.colors.warning,
  overlay: lightTheme.colors.overlay,
};

export const FONTS = {
  mono: lightTheme.typography.mono,
  monoSize: lightTheme.typography.monoSize,
  regular: lightTheme.typography.regular,
  /** Press Start 2P (Android: linked via react-native.config.js + react-native-asset) */
  pixel: lightTheme.typography.pixel,
};

export const STORAGE_KEYS = {
  session: '@bruce_session',
  baseUrl: '@bruce_base_url',
  lastFs: '@bruce_last_fs',
  lastPath: '@bruce_last_path',
};

export const DEFAULT_BASE_URL = 'http://172.0.0.1';
export const DEFAULT_USERNAME = 'admin';
export const DEFAULT_PASSWORD = 'admin';

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
