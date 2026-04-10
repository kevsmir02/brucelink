/**
 * Source contract tests for PayloadRunnerScreen.
 * Verifies: correct imports, no dead imports, architecture compliance.
 */

import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../src/screens/PayloadRunnerScreen.tsx'),
  'utf8',
);

describe('PayloadRunnerScreen source contract', () => {
  it('imports sendCommand from api', () => {
    expect(SOURCE).toMatch(/import.*sendCommand.*from.*api/);
  });

  it('imports getExecuteCommand from fileHelpers (not tacticalCommands)', () => {
    expect(SOURCE).toContain('getExecuteCommand');
    expect(SOURCE).toMatch(/import.*getExecuteCommand.*from.*fileHelpers/);
    expect(SOURCE).not.toMatch(/import.*from.*tacticalCommands/);
  });

  it('imports useFileList hook', () => {
    expect(SOURCE).toMatch(/import.*useFileList.*from/);
  });

  it('exports a named PayloadRunnerScreen function', () => {
    expect(SOURCE).toMatch(/export\s+function\s+PayloadRunnerScreen/);
  });

  it('uses FlatList for listing payloads', () => {
    expect(SOURCE).toContain('FlatList');
  });
});
