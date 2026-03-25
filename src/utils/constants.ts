export const COLORS = {
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceAlt: '#111111',
  primary: '#9b51e0',
  primaryDim: '#7b3fc2',
  text: '#e0e0e0',
  textMuted: '#888888',
  error: '#ff4444',
  errorDim: '#aa2222',
  border: '#333333',
  borderLight: '#444444',
  warning: '#ffaa00',
  overlay: 'rgba(0,0,0,0.7)',
};

export const FONTS = {
  mono: 'Courier New',
  monoSize: 13,
  regular: undefined, // system default
};

export const STORAGE_KEYS = {
  session: '@bruce_session',
  baseUrl: '@bruce_base_url',
  lastFs: '@bruce_last_fs',
  lastPath: '@bruce_last_path',
};

export const DEFAULT_BASE_URL = 'http://172.0.0.1';

/**
 * AsyncStorage session value while using "Skip login" in development.
 * All API calls use local mocks; no network.
 */
export const DEV_BYPASS_SESSION_TOKEN = '__BRUCELINK_DEV_UI_BYPASS__';
export const DEFAULT_USERNAME = 'admin';
export const DEFAULT_PASSWORD = 'admin';

export const EXECUTABLE_EXTENSIONS: Record<string, (path: string) => string> = {
  '.ir': path => `ir tx_from_file "${path}"`,
  '.sub': path => `subghz tx_from_file "${path}"`,
  '.js': path => `js run_from_file "${path}"`,
  '.bjs': path => `js run_from_file "${path}"`,
  '.txt': path => `badusb run_from_file "${path}"`,
  '.mp3': path => `play "${path}"`,
  '.wav': path => `play "${path}"`,
};

export const TEXT_EXTENSIONS = [
  '.txt', '.js', '.json', '.md', '.csv', '.log', '.cfg', '.ini',
  '.bjs', '.ir', '.sub', '.py', '.sh', '.bat', '.xml', '.html',
];
