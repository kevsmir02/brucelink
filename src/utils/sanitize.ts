// ---------------------------------------------------------------------------
// Input Sanitization — Security boundary for all user-supplied values before
// they reach the firmware API. OWASP A03 (Injection) mitigation.
// ---------------------------------------------------------------------------

const MAX_COMMAND_LENGTH = 512;
const MAX_CREDENTIAL_LENGTH = 128;

/**
 * Sanitize a filesystem path before sending to the firmware.
 * Blocks directory traversal, null bytes, backslashes, and empty input.
 */
export function sanitizePath(path: string): string {
  const trimmed = path.trim();

  if (trimmed.length === 0) {
    throw new Error('Path must not be empty');
  }

  if (trimmed.includes('\x00')) {
    throw new Error('Path must not contain null bytes');
  }

  if (trimmed.includes('\\')) {
    throw new Error('Path must not contain backslashes');
  }

  // Check for directory traversal — block any ".." segment
  const segments = trimmed.split('/');
  for (const segment of segments) {
    if (segment === '..') {
      throw new Error('Path must not contain directory traversal (..)');
    }
  }

  // Normalize double slashes
  return trimmed.replace(/\/{2,}/g, '/');
}

/**
 * Sanitize a CLI command string before dispatch to /cm endpoint.
 * Blocks null bytes, newline injection, and enforces length limit.
 */
export function sanitizeCommand(cmd: string): string {
  const trimmed = cmd.trim();

  if (trimmed.length === 0) {
    throw new Error('Command must not be empty');
  }

  if (trimmed.includes('\x00')) {
    throw new Error('Command must not contain null bytes');
  }

  if (/[\r\n]/.test(trimmed)) {
    throw new Error('Command must not contain newline characters');
  }

  if (trimmed.length > MAX_COMMAND_LENGTH) {
    throw new Error(`Command exceeds max length of ${MAX_COMMAND_LENGTH}`);
  }

  return trimmed;
}

/**
 * Sanitize a credential (username or password) before use.
 * Blocks control characters, null bytes, and enforces length limit.
 */
export function sanitizeCredential(input: string): string {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new Error('Credential must not be empty');
  }

  if (trimmed.includes('\x00')) {
    throw new Error('Credential must not contain null bytes');
  }

  // Block ASCII control characters (0x00-0x1F, 0x7F) except common whitespace
  // eslint-disable-next-line no-control-regex
  if (/[\x01-\x1f\x7f]/.test(trimmed)) {
    throw new Error('Credential must not contain control characters');
  }

  if (trimmed.length > MAX_CREDENTIAL_LENGTH) {
    throw new Error(`Credential exceeds max length of ${MAX_CREDENTIAL_LENGTH}`);
  }

  return trimmed;
}
