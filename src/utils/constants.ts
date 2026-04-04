export const COLORS = {
  background: '#050505',
  surface: '#0f0f0f',
  surfaceAlt: '#141414',
  primary: '#A855F7',
  primaryDim: '#9333EA',
  text: '#e0e0e0',
  textMuted: '#888888',
  error: '#ff4444',
  errorDim: '#aa2222',
  border: '#18181B',
  borderLight: '#27272A',
  warning: '#ffaa00',
  overlay: 'rgba(0,0,0,0.7)',
};

export const FONTS = {
  mono: 'Courier New',
  monoSize: 13,
  regular: undefined, // system default
  /** Press Start 2P (Android: linked via react-native.config.js + react-native-asset) */
  pixel: 'PressStart2P-Regular',
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
