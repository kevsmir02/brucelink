import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  deviceInfo: Record<string, unknown> | null;
  error: string | null;

  /** Derived: true only when status === 'connected' */
  isOnline: boolean;
  /** Derived: firmware version string or null */
  firmwareVersion: string | null;

  // Actions
  connect: () => void;
  setConnected: (info: Record<string, unknown>) => void;
  disconnect: () => void;
  setError: (msg: string) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveFirmwareVersion(info: Record<string, unknown> | null): string | null {
  if (info && typeof info.BRUCE_VERSION === 'string') {
    return info.BRUCE_VERSION;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'idle',
  deviceInfo: null,
  error: null,
  isOnline: false,
  firmwareVersion: null,

  connect: () => set({ status: 'connecting', error: null, isOnline: false }),

  setConnected: (info) =>
    set({
      status: 'connected',
      deviceInfo: info,
      error: null,
      isOnline: true,
      firmwareVersion: deriveFirmwareVersion(info),
    }),

  disconnect: () => set({ status: 'disconnected', isOnline: false }),

  setError: (msg) => set({ status: 'error', error: msg, isOnline: false }),

  reset: () =>
    set({
      status: 'idle',
      deviceInfo: null,
      error: null,
      isOnline: false,
      firmwareVersion: null,
    }),
}));
