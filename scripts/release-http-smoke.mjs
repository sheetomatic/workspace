// Test the built app inside the isolated build environment. No customer writes.
// This does not disable or access the Vercel-protected deployment URL.
import { spawn } from 'node:child_process';
const port=3819,origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port)],{env:process.env,stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 let ready=false;
 for(let i=0;i<60;i++){
  if(server.exitCode!==null)throw Error('Smoke server stopped');
  try{const r=await fetch(origin+'/login');if(r.status===200){ready=true;break;}}catch{}
  await delay(1000);
 }
 if(!ready)throw Error('Smoke server not ready');
 const checks=[
  ['/', ['/workspace-guides/home-dashboard.png', 'Festive offers', 'Subscribe to updates']],
  ['/updates/manage', ['Invalid email preference link']],
  ['/contact',['/contact/sheetomatic-contact-qr.svg']],
  ['/services/flow',['PM8E3mCw67Q','acTJOocmuZM']],
  ['/services/field-tracking',['Field Executive']],
  ['/pricing',['2,400','2,500']],
  ['/templates',['Useful templates']],
  ['/login',['Sign in']],
  ['/privacy',['Privacy']],
 ];
 for(const path of ['/workspace-guides/home-dashboard.png','/contact/sheetomatic-contact-qr.svg','/contact/sheetomatic-contact.vcf']){
   const r=await fetch(origin+path);
   if(r.status!==200)throw Error(`Missing image/contact asset: ${path}`);
   console.log(`[release-smoke] PASS ${path} HTTP 200`);
 }
 for(const [path,needles] of checks){
  const r=await fetch(origin+path,{redirect:'manual'}),html=await r.text();
  if(r.status!==200||needles.some(s=>!html.toLowerCase().includes(s.toLowerCase())))throw Error(`HTTP/content smoke failed: ${path} status ${r.status}`);
  if(path==='/templates'&&html.includes('Hosted Cloud Software'))throw Error('Removed hosted section reappeared');
  console.log(`[release-smoke] PASS ${path} HTTP 200 and expected content`);
 }
 for(const path of ['/app/hr','/app/field','/app/leads/meetings','/app/approvals','/app/settings/banners','/app/website-traffic','/app/leads/preleads','/app/leads/preleads/meta','/app/leads/preleads/subscribers']){
  const r=await fetch(origin+path,{redirect:'manual',headers:{host:'workspace.sheetomatic.com'}});
  if(![302,303,307,308].includes(r.status)||!r.headers.get('location')?.includes('/login'))throw Error(`Unauthenticated access guard failed: ${path}`);
  console.log(`[release-smoke] PASS ${path} protects authenticated access`);
 }
 for(const path of ['/api/updates/subscribe','/api/updates/manage']){
  const r=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://invalid.example'},body:'{}'});
  if(r.status!==403)throw Error('Subscriber origin guard failed');
  console.log(`[release-smoke] PASS ${path} rejects foreign origin without writes`);
 }
}finally{server.kill('SIGTERM');}
