// Only the additive subscriber table; no general migration deployment or existing data rewrites.
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const db=new PrismaClient({log:[]}),name='20261025120000_website_subscribers';
try {
 if(!process.env.RESEND_API_KEY?.trim()||!process.env.TASK_EMAIL_FROM?.trim())throw Error('Existing email configuration is required; no credentials will be created');
 if(await db.organization.count({where:{isPrimary:true}})!==1)throw Error('A unique primary website organization is required');
 const sql=readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8');
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(25120000)`;
  const table=await tx.$queryRaw`SELECT to_regclass('public."WebsiteSubscriber"')::text AS name`;
  if(!table[0]?.name)for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await tx.$executeRawUnsafe(statement);
  const columns=await tx.$queryRaw`SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='WebsiteSubscriber'`;
  const expected={id:'text',email:'text',name:'text',status:'text',consentVersion:'text',requestedAt:'timestamp without time zone',confirmedAt:'timestamp without time zone',unsubscribedAt:'timestamp without time zone',confirmationHash:'text',confirmationExpiresAt:'timestamp without time zone',unsubscribeToken:'text',lastConfirmationAt:'timestamp without time zone'};
  if(columns.length!==Object.keys(expected).length||columns.some(c=>expected[c.column_name]!==c.data_type))throw Error('Subscriber schema mismatch');
  const indexes=await tx.$queryRaw`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='WebsiteSubscriber'`;
  for(const field of ['email','confirmationHash','unsubscribeToken'])if(!indexes.some(i=>i.indexname===`WebsiteSubscriber_${field}_key`&&i.indexdef.includes('UNIQUE')&&i.indexdef.includes(field)))throw Error('Subscriber unique index mismatch');
  for(const index of ['WebsiteSubscriber_pkey','WebsiteSubscriber_status_requestedAt_idx'])if(!indexes.some(i=>i.indexname===index))throw Error('Subscriber index missing');
  const checks=await tx.$queryRaw`SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public."WebsiteSubscriber"'::regclass AND conname='WebsiteSubscriber_status_check'`;
  if(!checks.some(c=>['PENDING','ACTIVE','UNSUBSCRIBED'].every(v=>c.definition.includes(v))))throw Error('Subscriber status constraint missing');
 });
 const table=await db.$queryRaw`SELECT to_regclass('public."_prisma_migrations"')::text AS name`;
 const recorded=table[0]?.name?await db.$queryRaw`SELECT id FROM "_prisma_migrations" WHERE migration_name=${name} AND finished_at IS NOT NULL AND rolled_back_at IS NULL`:[];
 if(!recorded.length){const r=spawnSync('npx',['prisma','migrate','resolve','--applied',name],{env:{...process.env,DIRECT_URL:process.env.DIRECT_URL||process.env.DATABASE_URL},encoding:'utf8'});if(r.status!==0)throw Error('Subscriber migration bookkeeping failed; table preserved');}
 console.log('[website-subscribers-migration] PASS scoped additive table, indexes, migration record and existing email configuration');
}catch(error){console.error('[website-subscribers-migration] BLOCKED:',error instanceof Error&&!('code' in error)?error.message:'Database preflight error; inspect securely');process.exitCode=1;}finally{await db.$disconnect();}
