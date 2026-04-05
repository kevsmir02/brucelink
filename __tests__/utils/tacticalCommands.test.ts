import {
  getBadgeClonerCommand,
  getReconCommand,
  getSubGhzCommand,
  buildPayloadCommand,
} from '../../src/utils/tacticalCommands';

describe('tactical command mappings', () => {
  it('maps badge cloner actions to supported firmware commands', () => {
    expect(getBadgeClonerCommand('openRfid')).toBe('loader open RFID');
    expect(getBadgeClonerCommand('listApps')).toBe('loader list');
  });

  it('maps recon actions to supported wifi command set', () => {
    expect(getReconCommand('hostScan')).toBe('arp');
    expect(getReconCommand('sniffer')).toBe('sniffer');
    expect(getReconCommand('listener')).toBe('listen');
  });

  it('maps rf tool actions to supported subghz command set', () => {
    expect(getSubGhzCommand('capture')).toBe('subghz rx');
    expect(getSubGhzCommand('scan433')).toBe('subghz scan 433000000 434000000');
  });

  it('builds payload execution commands from file extension mapping', () => {
    expect(buildPayloadCommand('/scripts/run.js')).toBe('js run_from_file "/scripts/run.js"');
    expect(buildPayloadCommand('/scripts/payload.txt')).toBe('badusb run_from_file "/scripts/payload.txt"');
    expect(buildPayloadCommand('/scripts/notes.md')).toBeNull();
  });
});
