import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

const CHANGELOG_TEMPLATE = `# Changelog

## [Released]

### Changed
<!-- AUTO-CHANGELOG-ENTRIES -->
`;

function sh(command: string, cwd: string): string {
  return execSync(command, {
    cwd,
    encoding: 'utf8',
    env: process.env,
  }).trim();
}

function writeFile(repoDir: string, relativePath: string, content: string) {
  const fullPath = path.join(repoDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function commitFile(repoDir: string, relativePath: string, content: string, message: string) {
  writeFile(repoDir, relativePath, content);
  sh(`git add ${relativePath}`, repoDir);
  sh(`git commit -m "${message}" --no-verify`, repoDir);
}

function setupRepo(scriptContent: string): string {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brucelink-changelog-hook-'));
  sh('git init -q', repoDir);
  sh('git config user.email "test@example.com"', repoDir);
  sh('git config user.name "BruceLink Tests"', repoDir);

  writeFile(repoDir, 'CHANGELOG.md', CHANGELOG_TEMPLATE);
  writeFile(repoDir, 'scripts/changelog-post-commit.sh', scriptContent);
  sh('chmod +x scripts/changelog-post-commit.sh', repoDir);
  sh('git add CHANGELOG.md scripts/changelog-post-commit.sh', repoDir);
  sh('git commit -m "chore: seed repo" --no-verify', repoDir);

  return repoDir;
}

describe('changelog post-commit automation', () => {
  const scriptPath = path.join(__dirname, '../../scripts/changelog-post-commit.sh');
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');

  it('does not append docs-only commits to changelog', () => {
    const repoDir = setupRepo(scriptContent);

    commitFile(repoDir, 'docs/notes.md', '# notes\n', 'docs: update notes');
    sh('bash ./scripts/changelog-post-commit.sh', repoDir);

    const changelog = fs.readFileSync(path.join(repoDir, 'CHANGELOG.md'), 'utf8');
    expect(changelog).not.toContain('docs: update notes');
  });

  it('appends commits that touch mobile app files', () => {
    const repoDir = setupRepo(scriptContent);

    commitFile(repoDir, 'src/app.ts', 'export const app = true;\n', 'feat: update mobile app');
    sh('bash ./scripts/changelog-post-commit.sh', repoDir);

    const changelog = fs.readFileSync(path.join(repoDir, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toContain('feat: update mobile app');
  });
});
