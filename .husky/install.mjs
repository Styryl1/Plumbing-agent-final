import { chmodSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

if (process.env.HUSKY === '0') {
  process.exit(0);
}

const gitDir = spawnSync('git', ['rev-parse', '--git-dir'], {
  stdio: 'ignore',
});

if (gitDir.status !== 0) {
  process.exit(0);
}

const setHooks = spawnSync('git', ['config', 'core.hooksPath', '.husky'], {
  stdio: 'inherit',
});

if (setHooks.status !== 0) {
  process.exit(setHooks.status ?? 1);
}

const preCommitPath = resolve('.husky', 'pre-commit');
if (existsSync(preCommitPath)) {
  chmodSync(preCommitPath, 0o755);
}
