// Apply a pinned, checksum-gated delta to the verified CURRENT deployed input.
// No migrations, tenant seeding, messaging, credential changes, or alias changes.
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const revision = process.env.CONSOLIDATED_RELEASE_REVISION;
if (!/^[a-f0-9]{40}$/.test(revision || '')) throw Error('Missing exact release revision');
const hash = (b, algorithm) => createHash(algorithm).update(b).digest('hex');
async function source(path) {
  const response = await fetch(`https://raw.githubusercontent.com/sheetomatic/workspace/${revision}/${path}`, { redirect: 'error' });
  if (!response.ok) throw Error(`Pinned source unavailable: ${path}`);
  return Buffer.from(await response.arrayBuffer());
}
const manifest = JSON.parse((await source('scripts/consolidated-release-files.json')).toString());
if (manifest.baseline !== 'dpl_75i2VWs4yf4BYLeEux7QmuSWJbRu') throw Error('Unexpected baseline');
// Validate EVERY baseline before modifying any file.
for (const file of manifest.files) {
  if (file.path.startsWith('/') || file.path.split('/').includes('..')) throw Error('Unsafe path');
  let before = null;
  try { before = await readFile(file.path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if ((before ? hash(before, 'sha1') : null) !== file.before) throw Error(`Live source mismatch: ${file.path}`);
}
for (let i = 0; i < manifest.files.length; i += 10) {
  await Promise.all(manifest.files.slice(i, i + 10).map(async file => {
    if (!file.after) { await unlink(file.path); return; }
    const bytes = await source(file.path);
    if (hash(bytes, 'sha256') !== file.after) throw Error(`Source checksum mismatch: ${file.path}`);
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, bytes);
  }));
}
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) throw Error(`Release step failed: ${command} ${args.join(' ')}`);
}
run('npm', ['ci', '--ignore-scripts']);
run('npm', ['run', 'db:generate']);
run('node', ['scripts/release-schema-preflight.mjs']);
run('npx', ['next', 'build', '--webpack']);
console.log(`[consolidated-release] Verified source ${revision}; baseline ${manifest.baseline}; no migrations performed`);
