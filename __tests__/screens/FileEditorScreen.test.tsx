/**
 * Source contract tests for FileEditorScreen.
 * Verifies: correct imports, text editing, save capability.
 */

import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../src/screens/FileEditorScreen.tsx'),
  'utf8',
);

describe('FileEditorScreen source contract', () => {
  it('imports saveFileContent from api', () => {
    expect(SOURCE).toMatch(/import.*saveFileContent.*from.*api/);
  });

  it('imports useFileContent hook', () => {
    expect(SOURCE).toMatch(/import.*useFileContent.*from/);
  });

  it('exports a named FileEditorScreen function', () => {
    expect(SOURCE).toMatch(/export\s+function\s+FileEditorScreen/);
  });

  it('uses TextInput for editing', () => {
    expect(SOURCE).toContain('TextInput');
  });

  it('uses fileHelpers for execute command support', () => {
    expect(SOURCE).toMatch(/import.*from.*fileHelpers/);
  });
});
