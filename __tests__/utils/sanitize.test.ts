import { sanitizePath, sanitizeCommand, sanitizeCredential } from '../../src/utils/sanitize';

// ---------------------------------------------------------------------------
// sanitizePath
// ---------------------------------------------------------------------------
describe('sanitizePath', () => {
  it('passes through a simple absolute path', () => {
    expect(sanitizePath('/subghz/gate.sub')).toBe('/subghz/gate.sub');
  });

  it('passes through root path', () => {
    expect(sanitizePath('/')).toBe('/');
  });

  it('blocks directory traversal with ..', () => {
    expect(() => sanitizePath('/subghz/../../etc/passwd')).toThrow('traversal');
  });

  it('blocks directory traversal at start', () => {
    expect(() => sanitizePath('../secret')).toThrow('traversal');
  });

  it('blocks embedded null bytes', () => {
    expect(() => sanitizePath('/subghz/file\x00.sub')).toThrow('null');
  });

  it('normalizes double slashes', () => {
    expect(sanitizePath('/subghz//gate.sub')).toBe('/subghz/gate.sub');
  });

  it('trims whitespace', () => {
    expect(sanitizePath('  /subghz/gate.sub  ')).toBe('/subghz/gate.sub');
  });

  it('blocks empty path', () => {
    expect(() => sanitizePath('')).toThrow();
  });

  it('blocks whitespace-only path', () => {
    expect(() => sanitizePath('   ')).toThrow();
  });

  it('allows paths with dots in filenames', () => {
    expect(sanitizePath('/data/file.v2.sub')).toBe('/data/file.v2.sub');
  });

  it('allows relative paths without traversal', () => {
    expect(sanitizePath('subghz/gate.sub')).toBe('subghz/gate.sub');
  });

  it('blocks backslashes', () => {
    expect(() => sanitizePath('/subghz\\..\\etc')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// sanitizeCommand
// ---------------------------------------------------------------------------
describe('sanitizeCommand', () => {
  it('passes through a normal command', () => {
    expect(sanitizeCommand('rf rx 433920000')).toBe('rf rx 433920000');
  });

  it('passes through commands with flags', () => {
    expect(sanitizeCommand('ir rx --raw')).toBe('ir rx --raw');
  });

  it('passes through commands with quotes and paths', () => {
    expect(sanitizeCommand('rf tx_from_file "/subghz/gate.sub"')).toBe(
      'rf tx_from_file "/subghz/gate.sub"',
    );
  });

  it('passes through JSON-format commands', () => {
    const cmd = 'RfSend {"Data":"0x447503","Bits":24}';
    expect(sanitizeCommand(cmd)).toBe(cmd);
  });

  it('blocks null bytes', () => {
    expect(() => sanitizeCommand('rf rx\x00malicious')).toThrow('null');
  });

  it('trims whitespace', () => {
    expect(sanitizeCommand('  rf rx  ')).toBe('rf rx');
  });

  it('blocks empty command', () => {
    expect(() => sanitizeCommand('')).toThrow();
  });

  it('blocks newline injection', () => {
    expect(() => sanitizeCommand('rf rx\nmalicious')).toThrow('newline');
  });

  it('blocks carriage return injection', () => {
    expect(() => sanitizeCommand('rf rx\rmalicious')).toThrow('newline');
  });

  it('enforces max length', () => {
    const long = 'a'.repeat(513);
    expect(() => sanitizeCommand(long)).toThrow('length');
  });

  it('allows commands up to 512 chars', () => {
    const cmd = 'a'.repeat(512);
    expect(sanitizeCommand(cmd)).toBe(cmd);
  });
});

// ---------------------------------------------------------------------------
// sanitizeCredential
// ---------------------------------------------------------------------------
describe('sanitizeCredential', () => {
  it('passes through a normal string', () => {
    expect(sanitizeCredential('admin')).toBe('admin');
  });

  it('trims whitespace', () => {
    expect(sanitizeCredential('  bruce  ')).toBe('bruce');
  });

  it('blocks empty input', () => {
    expect(() => sanitizeCredential('')).toThrow();
  });

  it('blocks whitespace-only input', () => {
    expect(() => sanitizeCredential('   ')).toThrow();
  });

  it('blocks control characters', () => {
    expect(() => sanitizeCredential('user\x01name')).toThrow('control');
  });

  it('blocks null bytes', () => {
    expect(() => sanitizeCredential('user\x00name')).toThrow();
  });

  it('enforces max length of 128', () => {
    const long = 'a'.repeat(129);
    expect(() => sanitizeCredential(long)).toThrow('length');
  });

  it('allows credential at max length', () => {
    const cred = 'a'.repeat(128);
    expect(sanitizeCredential(cred)).toBe(cred);
  });

  it('allows special characters in passwords', () => {
    expect(sanitizeCredential('P@ss$w0rd!#%^&*')).toBe('P@ss$w0rd!#%^&*');
  });
});
