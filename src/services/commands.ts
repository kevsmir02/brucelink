// ---------------------------------------------------------------------------
// Centralized Command Builder — Single source of truth for all firmware CLI
// commands. Every command string sent to the Bruce firmware /cm endpoint MUST
// be produced by a builder in this module.
//
// Matches: Bruce firmware v1.14 SimpleCLI command registration
// Source:  /firmware/src/core/serial_commands/*.cpp
// ---------------------------------------------------------------------------

import type {
  RfRxParams,
  RfTxParams,
  RfScanParams,
  RfTxFileParams,
  RfSendJson,
  IrRxParams,
  IrTxParams,
  IrTxRawParams,
  IrTxFileParams,
  IrSendJson,
  WifiAddParams,
  WebuiParams,
  NavDirection,
  ScreenColorRgbParams,
  ToneParams,
  SettingName,
  GpioMode,
  StorageType,
} from '../types/firmware';

// ---------------------------------------------------------------------------
// RF (CC1101 / Sub-GHz) — rf_commands.cpp
// Aliases: rf, subghz
// ---------------------------------------------------------------------------

export const rf = {
  rx(params?: RfRxParams): string {
    const parts = ['rf rx'];
    if (params?.frequency != null) parts.push(String(params.frequency));
    if (params?.raw) parts.push('--raw');
    return parts.join(' ');
  },

  tx(params: RfTxParams): string {
    const freq = params.frequency ?? 0;
    const te = params.te ?? 0;
    const count = params.count ?? 10;
    return `rf tx ${params.key} ${freq} ${te} ${count}`;
  },

  scan(params: RfScanParams): string {
    return `rf scan ${params.startFrequency} ${params.stopFrequency}`;
  },

  txFromFile(params: RfTxFileParams): string {
    return `rf tx_from_file "${params.filepath}"`;
  },

  sendJson(params: RfSendJson): string {
    const payload: RfSendJson = {
      Data: params.Data,
      Bits: params.Bits ?? 32,
      Protocol: params.Protocol ?? 1,
      Pulse: params.Pulse ?? 0,
      Repeat: params.Repeat ?? 10,
    };
    return `RfSend ${JSON.stringify(payload)}`;
  },
};

// ---------------------------------------------------------------------------
// IR — ir_commands.cpp
// ---------------------------------------------------------------------------

export const ir = {
  rx(params?: IrRxParams): string {
    if (params?.raw) return 'ir rx --raw';
    return 'ir rx';
  },

  tx(params: IrTxParams): string {
    return `ir tx ${params.protocol} ${params.address} ${params.command}`;
  },

  txRaw(params: IrTxRawParams): string {
    return `ir tx_raw ${params.frequency} ${params.samples}`;
  },

  txFromFile(params: IrTxFileParams): string {
    return `ir tx_from_file "${params.filepath}"`;
  },

  sendJson(params: IrSendJson): string {
    const payload: IrSendJson = {
      Protocol: params.Protocol ?? 'NEC',
      Bits: params.Bits ?? 32,
      Data: params.Data,
    };
    return `IRSend ${JSON.stringify(payload)}`;
  },
};

// ---------------------------------------------------------------------------
// WiFi — wifi_commands.cpp
// ---------------------------------------------------------------------------

export const wifi = {
  on(): string {
    return 'wifi on';
  },

  off(): string {
    return 'wifi off';
  },

  add(params: WifiAddParams): string {
    return `wifi add ${params.ssid} ${params.password}`;
  },

  webui(params?: WebuiParams): string {
    if (params?.noAp) return 'webui --noAp';
    return 'webui';
  },

  arp(): string {
    return 'arp';
  },

  listen(): string {
    return 'listen';
  },

  sniffer(): string {
    return 'sniffer';
  },
};

// ---------------------------------------------------------------------------
// Navigation — util_commands.cpp (nav/navigate/navigation)
// ---------------------------------------------------------------------------

export const nav = {
  press(direction: NavDirection, duration?: number): string {
    if (duration != null) return `nav ${direction} ${duration}`;
    return `nav ${direction}`;
  },
};

// ---------------------------------------------------------------------------
// Power — power_commands.cpp
// ---------------------------------------------------------------------------

export const power = {
  off(): string {
    return 'poweroff';
  },

  reboot(): string {
    return 'reboot';
  },

  sleep(): string {
    return 'sleep';
  },
};

// ---------------------------------------------------------------------------
// Screen — screen_commands.cpp
// ---------------------------------------------------------------------------

export const screen = {
  brightness(value: number): string {
    return `screen brightness ${value}`;
  },

  colorRgb(params: ScreenColorRgbParams): string {
    return `screen color rgb ${params.red} ${params.green} ${params.blue}`;
  },

  colorHex(value: string): string {
    return `screen color hex ${value}`;
  },

  clock(): string {
    return 'clock';
  },
};

// ---------------------------------------------------------------------------
// Sound — sound_commands.cpp
// ---------------------------------------------------------------------------

export const sound = {
  tone(params?: ToneParams): string {
    const freq = params?.frequency ?? 500;
    const dur = params?.duration ?? 500;
    return `tone ${freq} ${dur}`;
  },

  play(song: string): string {
    return `play ${song}`;
  },
};

// ---------------------------------------------------------------------------
// Storage — storage_commands.cpp
// ---------------------------------------------------------------------------

export const storage = {
  list(filepath?: string): string {
    return `storage list ${filepath ?? '/'}`;
  },

  read(filepath: string): string {
    return `storage read ${filepath}`;
  },

  remove(filepath: string): string {
    return `storage remove ${filepath}`;
  },

  write(filepath: string, size?: number): string {
    return `storage write ${filepath} ${size ?? 0}`;
  },

  rename(filepath: string, newName: string): string {
    return `storage rename ${filepath} ${newName}`;
  },

  copy(filepath: string, newName: string): string {
    return `storage copy ${filepath} ${newName}`;
  },

  mkdir(filepath: string): string {
    return `storage mkdir ${filepath}`;
  },

  rmdir(filepath: string): string {
    return `storage rmdir ${filepath}`;
  },

  md5(filepath: string): string {
    return `storage md5 ${filepath}`;
  },

  crc32(filepath: string): string {
    return `storage crc32 ${filepath}`;
  },

  stat(filepath: string): string {
    return `storage stat ${filepath}`;
  },

  free(storageType: StorageType): string {
    return `storage free ${storageType}`;
  },
};

// ---------------------------------------------------------------------------
// BadUSB — badusb_commands.cpp
// ---------------------------------------------------------------------------

export const badusb = {
  runFromFile(filepath: string): string {
    return `badusb run_from_file "${filepath}"`;
  },
};

// ---------------------------------------------------------------------------
// Interpreter (JS) — interpreter_commands.cpp
// ---------------------------------------------------------------------------

export const interpreter = {
  runFromFile(filepath: string): string {
    return `js run_from_file "${filepath}"`;
  },
};

// ---------------------------------------------------------------------------
// GPIO — gpio_commands.cpp
// ---------------------------------------------------------------------------

export const gpio = {
  mode(pin: number, mode: GpioMode): string {
    return `gpio mode ${pin} ${mode}`;
  },

  set(pin: number, value: 0 | 1): string {
    return `gpio set ${pin} ${value}`;
  },

  read(pin: number): string {
    return `gpio read ${pin}`;
  },
};

// ---------------------------------------------------------------------------
// Crypto — crypto_commands.cpp
// ---------------------------------------------------------------------------

export const crypto = {
  decrypt(filepath: string, password: string): string {
    return `crypto decrypt_from_file ${filepath} ${password}`;
  },

  encrypt(filepath: string, password: string): string {
    return `crypto encrypt_to_file ${filepath} ${password}`;
  },
};

// ---------------------------------------------------------------------------
// Settings — settings_commands.cpp
// ---------------------------------------------------------------------------

export const settings = {
  getAll(): string {
    return 'settings';
  },

  get(name: SettingName): string {
    return `settings ${name}`;
  },

  set(name: SettingName, value: string): string {
    return `settings ${name} ${value}`;
  },

  factoryReset(): string {
    return 'factory_reset';
  },
};

// ---------------------------------------------------------------------------
// Loader — util_commands.cpp
// ---------------------------------------------------------------------------

export const loader = {
  list(): string {
    return 'loader list';
  },

  open(appName: string): string {
    return `loader open ${appName}`;
  },
};

// ---------------------------------------------------------------------------
// Util — util_commands.cpp
// ---------------------------------------------------------------------------

export const util = {
  info(): string {
    return 'info';
  },

  help(): string {
    return 'help';
  },

  uptime(): string {
    return 'uptime';
  },

  date(): string {
    return 'date';
  },

  free(): string {
    return 'free';
  },

  optionsJson(): string {
    return 'optionsJSON';
  },
};
