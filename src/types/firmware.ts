// ---------------------------------------------------------------------------
// Firmware Types — Single source of truth for Bruce firmware v1.14 API contract
// Matches: /home/toji/Desktop/Projects/firmware/src/core/serial_commands/*.cpp
// Board: Smoochie Board (ESP32-S3 N16R8)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// HTTP API Response Types
// ---------------------------------------------------------------------------

export interface SystemInfo {
  BRUCE_VERSION: string;
  SD: StorageInfo;
  LittleFS: StorageInfo;
}

export interface StorageInfo {
  free: string;
  used: string;
  total: string;
}

export interface FileEntry {
  type: 'parent' | 'folder' | 'file';
  name: string;
  size: string;
  path: string;
}

export type FileSystem = 'SD' | 'LittleFS';

// ---------------------------------------------------------------------------
// CLI Command Categories
// ---------------------------------------------------------------------------

export type CommandCategory =
  | 'wifi'
  | 'rf'
  | 'ir'
  | 'ble'
  | 'nrf24'
  | 'rfid'
  | 'gps'
  | 'storage'
  | 'power'
  | 'screen'
  | 'settings'
  | 'nav'
  | 'interpreter'
  | 'badusb'
  | 'crypto'
  | 'gpio'
  | 'sound'
  | 'util';

// ---------------------------------------------------------------------------
// RF (CC1101 / Sub-GHz) Command Parameters
// ---------------------------------------------------------------------------

export interface RfRxParams {
  frequency?: number;
  raw?: boolean;
}

export interface RfTxParams {
  key: string;
  frequency?: number;
  te?: number;
  count?: number;
}

export interface RfScanParams {
  startFrequency: number;
  stopFrequency: number;
}

export interface RfTxFileParams {
  filepath: string;
  hideDefaultUI?: boolean;
}

/** Tasmota-compatible JSON protocol for RF transmission */
export interface RfSendJson {
  Data: string;
  Bits?: number;
  Protocol?: number;
  Pulse?: number;
  Repeat?: number;
}

// ---------------------------------------------------------------------------
// IR Command Parameters
// ---------------------------------------------------------------------------

export interface IrRxParams {
  raw?: boolean;
}

export type IrProtocol = 'NEC' | 'NECext' | 'SIRC' | 'Samsung32' | 'RC5' | 'RC5X' | 'RC6';

export interface IrTxParams {
  protocol: IrProtocol;
  address: string;
  command: string;
}

export interface IrTxRawParams {
  frequency: number;
  samples: string;
}

export interface IrTxFileParams {
  filepath: string;
  hideDefaultUI?: boolean;
}

/** Tasmota-compatible JSON protocol for IR transmission */
export interface IrSendJson {
  Protocol?: string;
  Bits?: number;
  Data: string;
}

// ---------------------------------------------------------------------------
// WiFi Command Parameters
// ---------------------------------------------------------------------------

export type WifiStatus = 'on' | 'off';

export interface WifiAddParams {
  ssid: string;
  password: string;
}

export interface WebuiParams {
  noAp?: boolean;
}

// ---------------------------------------------------------------------------
// Navigation Parameters
// ---------------------------------------------------------------------------

export type NavDirection = 'sel' | 'esc' | 'up' | 'down' | 'next' | 'prev' | 'nextpage' | 'prevpage';

export interface NavParams {
  direction: NavDirection;
  duration?: number;
}

// ---------------------------------------------------------------------------
// Power Parameters
// ---------------------------------------------------------------------------

export type PowerAction = 'off' | 'reboot' | 'sleep';

// ---------------------------------------------------------------------------
// Screen Parameters
// ---------------------------------------------------------------------------

export interface ScreenBrightnessParams {
  value: number; // 0-255
}

export interface ScreenColorRgbParams {
  red: number;
  green: number;
  blue: number;
}

export interface ScreenColorHexParams {
  value: string; // hex string, max 0xFFFFFF
}

// ---------------------------------------------------------------------------
// Sound Parameters
// ---------------------------------------------------------------------------

export interface ToneParams {
  frequency?: number;
  duration?: number;
}

export interface PlayParams {
  song: string; // RTTTL string or .wav/.mp3 filepath
}

// ---------------------------------------------------------------------------
// Storage Parameters
// ---------------------------------------------------------------------------

export interface StorageListParams {
  filepath?: string;
}

export interface StorageReadParams {
  filepath: string;
}

export interface StorageRemoveParams {
  filepath: string;
}

export interface StorageWriteParams {
  filepath: string;
  size?: number;
}

export interface StorageRenameParams {
  filepath: string;
  newName: string;
}

export interface StorageCopyParams {
  filepath: string;
  newName: string;
}

export interface StorageMkdirParams {
  filepath: string;
}

export type StorageType = 'sd' | 'littlefs';

export interface StorageFreeParams {
  storageType: StorageType;
}

// ---------------------------------------------------------------------------
// BadUSB Parameters
// ---------------------------------------------------------------------------

export interface BadusbFileParams {
  filepath: string;
}

// ---------------------------------------------------------------------------
// Interpreter Parameters
// ---------------------------------------------------------------------------

export interface JsRunFileParams {
  filepath: string;
}

// ---------------------------------------------------------------------------
// GPIO Parameters
// ---------------------------------------------------------------------------

export type GpioMode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface GpioModeParams {
  pin: number;
  mode: GpioMode;
}

export interface GpioSetParams {
  pin: number;
  value: 0 | 1;
}

export interface GpioReadParams {
  pin: number;
}

// ---------------------------------------------------------------------------
// Crypto Parameters
// ---------------------------------------------------------------------------

export interface CryptoDecryptParams {
  filepath: string;
  password: string;
}

export interface CryptoEncryptParams {
  filepath: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Settings Parameters
// ---------------------------------------------------------------------------

export type SettingName =
  | 'priColor'
  | 'rot'
  | 'dimmerSet'
  | 'bright'
  | 'tmz'
  | 'soundEnabled'
  | 'wifiAtStartup'
  | 'webUI'
  | 'wifiAp'
  | 'wifi'
  | 'bleName'
  | 'irTx'
  | 'irTxRepeats'
  | 'irRx'
  | 'rfTx'
  | 'rfRx'
  | 'rfModule'
  | 'rfFreq'
  | 'rfFxdFreq'
  | 'rfScanRange'
  | 'rfidModule'
  | 'wigleBasicToken'
  | 'devMode'
  | 'disabledMenus';

export interface SettingsGetParams {
  name: SettingName;
}

export interface SettingsSetParams {
  name: SettingName;
  value: string;
}

// ---------------------------------------------------------------------------
// Loader Parameters
// ---------------------------------------------------------------------------

export interface LoaderOpenParams {
  appName: string;
}

// ---------------------------------------------------------------------------
// Display Parameters
// ---------------------------------------------------------------------------

export type DisplayOption = 'start' | 'stop' | 'status' | 'dump' | 'info';

// ---------------------------------------------------------------------------
// Command Response
// ---------------------------------------------------------------------------

export interface CommandResponse {
  raw: string;
  success: boolean;
}

// ---------------------------------------------------------------------------
// Command History
// ---------------------------------------------------------------------------

export interface CommandHistoryItem {
  command: string;
  response: string;
  timestamp: number;
  success: boolean;
}

// ---------------------------------------------------------------------------
// App-level Navigation
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  FileExplorer: { fs?: FileSystem; folder?: string };
  FileEditor: { fs: FileSystem; filePath: string };
  Terminal: undefined;
  Settings: undefined;
  Navigator: undefined;
  SubGhz: undefined;
  Infrared: undefined;
  RfidNfc: undefined;
  Ble: undefined;
  Nrf24: undefined;
  WifiAttack: undefined;
  Gps: undefined;
  PayloadRunner: undefined;
};

// ---------------------------------------------------------------------------
// RF Frequency Presets (common Sub-GHz frequencies)
// ---------------------------------------------------------------------------

export const RF_FREQUENCY_PRESETS = {
  '315MHz': 315000000,
  '433.92MHz': 433920000,
  '868MHz': 868000000,
  '915MHz': 915000000,
} as const;

export type RfFrequencyPreset = keyof typeof RF_FREQUENCY_PRESETS;
