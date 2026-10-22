// Reconstruct the currently deployed source before applying a small services overlay.
// No migrations, data seeding, payment actions, messages, or Calendar configuration changes.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const revision=process.env.SERVICES_RELEASE_REVISION;
if(!/^[a-f0-9]{40}$/.test(revision??''))throw Error('Missing pinned services revision');
const digest=b=>createHash('sha256').update(b).digest('hex');
async function fetchFile(path){const r=await fetch(`https://raw.githubusercontent.com/sheetomatic/workspace/${revision}/${path}`,{redirect:'error'});if(!r.ok)throw Error(`Source fetch failed: ${path}`);return Buffer.from(await r.arrayBuffer());}
function run(cmd,args,env=process.env){const r=spawnSync(cmd,args,{stdio:'inherit',env});if(r.status!==0)throw Error(`Release step failed: ${cmd}`);}
const reconstruct=await fetchFile('scripts/reconstruct-preserved.mjs');
if(digest(reconstruct)!=='0b5a77413c2887590200c986bf5dc5d78126bd1dcf258d28d2921ebea1b8a497')throw Error('Baseline script checksum mismatch');
await writeFile('/tmp/reconstruct-services-baseline.mjs',reconstruct);
run(process.execPath,['/tmp/reconstruct-services-baseline.mjs','--prepare-only'],{
  ...process.env,RELEASE_REVISION:'',CALENDAR_RELEASE_REVISION:'',CALENDAR_MIGRATIONS_ENABLED:'false',
  PRIVACY_RELEASE_REVISION:'94ab97e8b9b67e3a63b66b919cd7ae1acbdcb0b5',
  TASKS_RELEASE_REVISION:'94ab97e8b9b67e3a63b66b919cd7ae1acbdcb0b5',PRESERVE_LIVE_CALENDAR:'1',
});
const manifest=JSON.parse((await fetchFile('scripts/services-release-files.json')).toString());
for(const f of manifest){let current=null;try{current=await readFile(f.path);}catch(e){if(e.code!=='ENOENT')throw e;}
  if((current?digest(current):null)!==f.before)throw Error(`Services baseline mismatch: ${f.path}`);
  const bytes=await fetchFile(f.path);if(digest(bytes)!==f.sha256)throw Error(`Services checksum mismatch: ${f.path}`);
  await mkdir(dirname(f.path),{recursive:true});await writeFile(f.path,bytes);
}
run('npm',['run','db:generate']);
run('npx',['vitest','run','src/lib/content/services-wiring.test.ts','src/lib/content/business-systems-pricing.test.ts','src/lib/tasks/checkout-commerce.test.ts','src/lib/templates/commerce.test.ts']);
run('npx',['next','build']);
