import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

// SPEC-001 plan §3.6: no shell command interpolation; raw output belongs to this run.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
// SPEC-007: evidence must belong to the selected live Spec, never escape versions/.
const specRoot = await realpath(resolve(root, process.env.AVALON_TEST_SPEC_DIR || 'spec/versions/v0.1/specs/20261107-1429-tech-开发态应用骨架'));
const versionsRoot = await realpath(resolve(root, 'spec/versions'));
const specRelative = relative(versionsRoot, specRoot);
if (!specRelative || specRelative.startsWith('..') || isAbsolute(specRelative)) throw new Error('INVALID_TEST_SPEC_DIR');
await readFile(resolve(specRoot, 'lead/team-context.md'));
const runDir = resolve(specRoot, 'tester/artifacts/test-logs', runId);
await mkdir(runDir, { recursive: true });
const env = { ...process.env, AVALON_TEST_RUN_DIR: runDir, AVALON_TEST_RUN_ID: runId };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_RENDERER_URL;
delete env.NO_SANDBOX;
delete env.ELECTRON_CLI_ARGS;
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
await writeFile(resolve(runDir, 'environment.json'), JSON.stringify({
  runId, timestamp: new Date().toISOString(), role: 'local developer (no account)',
  os: `${os.platform()} ${os.release()} ${os.arch()}`, node: process.version,
  npm: process.env.npm_config_user_agent, electron: require('electron/package.json').version,
  gitSha: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'),
  worktreeStatus: git('status', '--porcelain'),
  lockfileSha256: createHash('sha256').update(await readFile(resolve(root, 'package-lock.json'))).digest('hex'),
}, null, 2));
console.log(`Run ID: ${runId}\nEvidence: ${runDir}`);

async function run(label, args) {
  const output = createWriteStream(resolve(runDir, `${label}.txt`), { flags: 'wx' });
  output.write(`Command: node ${args.join(' ')}\nTimestamp: ${new Date().toISOString()}\n`);
  const child = spawn(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (data) => { process.stdout.write(data); output.write(data); });
  child.stderr.on('data', (data) => { process.stderr.write(data); output.write(data); });
  const code = await new Promise((resolveExit) => {
    child.on('error', (error) => { output.write(`${error.stack}\n`); resolveExit(1); });
    child.on('close', (code, signal) => resolveExit(code ?? (signal ? 1 : 0)));
  });
  await new Promise((done) => output.end(`Exit code: ${code}\n`, done));
  return code;
}

let exitCode = 0;
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Start this runner through npm run test:e2e.');
for (const command of ['typecheck', 'test:unit', 'build']) {
  exitCode = await run(command.replace(':', '-'), [npmCli, 'run', command]);
  if (exitCode !== 0) break;
}
if (exitCode === 0) exitCode = await run('desktop', [require.resolve('@playwright/test/cli'), 'test', ...process.argv.slice(2)]);
await writeFile(resolve(runDir, 'run-result.json'), JSON.stringify({ runId, timestamp: new Date().toISOString(), exitCode }, null, 2));
process.exitCode = exitCode;
