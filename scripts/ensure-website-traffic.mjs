// Scoped additive migration only. No migrate deploy, resets, data rewrites or unrelated migrations.
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const db = new PrismaClient({log:[]});
const name='20261024120000_website_traffic';
try {
  const primaryCount=await db.organization.count({where:{isPrimary:true}});
  if(primaryCount!==1)throw Error('Exactly one primary website organization is required; no settings were changed');
  const sql=readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8');
  await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(24120000)`;
    const table=await tx.$queryRaw`SELECT to_regclass('public."WebsitePageView"')::text AS name`;
    if(!table[0]?.name)for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await tx.$executeRawUnsafe(statement);
    const columns=await tx.$queryRaw`SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='WebsitePageView'`;
    const expected={id:'text',visitorHash:'text',path:'text',source:'text',createdAt:'timestamp without time zone'};
    if(columns.length!==5||columns.some(c=>expected[c.column_name]!==c.data_type))throw Error('WebsitePageView schema mismatch; refusing to continue');
    const indexes=await tx.$queryRaw`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='WebsitePageView'`;
    for(const index of ['WebsitePageView_pkey','WebsitePageView_createdAt_idx','WebsitePageView_visitorHash_createdAt_idx'])if(!indexes.some(i=>i.indexname===index))throw Error('WebsitePageView index mismatch');
  });
  const migrationTable=await db.$queryRaw`SELECT to_regclass('public."_prisma_migrations"')::text AS name`;
  const recorded=migrationTable[0]?.name ? await db.$queryRaw`SELECT id FROM "_prisma_migrations" WHERE migration_name=${name} AND finished_at IS NOT NULL AND rolled_back_at IS NULL` : [];
  if(!recorded.length){
    const result=spawnSync('npx',['prisma','migrate','resolve','--applied',name],{env:{...process.env,DIRECT_URL:process.env.DIRECT_URL || process.env.DATABASE_URL},encoding:'utf8'});
    if(result.status!==0)throw Error('Scoped migration bookkeeping failed; table preserved; inspect migration status before retry');
  }
  console.log('[website-traffic-migration] PASS scoped additive table/indexes, migration record and unique primary organization');
} catch(error) { console.error('[website-traffic-migration] BLOCKED:', error instanceof Error && !('code' in error) ? error.message : 'Database preflight/migration error; inspect securely');process.exitCode=1; }
finally{await db.$disconnect();}
