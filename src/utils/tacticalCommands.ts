import { getExecuteCommand } from './fileHelpers';

export type BadgeClonerAction = 'openRfid' | 'listApps';
export type ReconAction = 'hostScan' | 'sniffer' | 'listener';
export type SubGhzAction = 'capture' | 'scan433';

const BADGE_CLONER_COMMANDS: Record<BadgeClonerAction, string> = {
  openRfid: 'loader open RFID',
  listApps: 'loader list',
};

const RECON_COMMANDS: Record<ReconAction, string> = {
  hostScan: 'arp',
  sniffer: 'sniffer',
  listener: 'listen',
};

const SUB_GHZ_COMMANDS: Record<SubGhzAction, string> = {
  capture: 'subghz rx',
  scan433: 'subghz scan 433000000 434000000',
};

export function getBadgeClonerCommand(action: BadgeClonerAction): string {
  return BADGE_CLONER_COMMANDS[action];
}

export function getReconCommand(action: ReconAction): string {
  return RECON_COMMANDS[action];
}

export function getSubGhzCommand(action: SubGhzAction): string {
  return SUB_GHZ_COMMANDS[action];
}

export function buildPayloadCommand(filePath: string): string | null {
  return getExecuteCommand(filePath);
}