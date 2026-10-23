// Explicit scoped, additive migration. Never runs the pending migration backlog.
import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
const migration='20261023080000_checkout_storage';
if(process.argv[2]!=='--apply-reviewed-checkout-storage')throw Error('Explicit migration selection required');
const sql=await readFile(`prisma/migrations/${migration}/migration.sql`,'utf8');
const db=new PrismaClient({log:[]});
try {
 await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(23102026)::text`;
  const recorded=await tx.$queryRaw`SELECT checksum, finished_at FROM "_prisma_migrations" WHERE migration_name=${migration} AND rolled_back_at IS NULL`;
  const checksum=createHash('sha256').update(sql).digest('hex');
  if(recorded.length){
   if(recorded.length!==1||recorded[0].checksum!==checksum||!recorded[0].finished_at)throw Error('Migration history mismatch');
   console.log('[checkout-storage] Reviewed migration already applied');return;
  }
  const tables=await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('TemplateCheckout','TemplateInvoiceCounter')`;
  if(tables.length)throw Error('Unexpected existing checkout tables; inspect before changing');
  for(const statement of sql.split(';').map(x=>x.trim()).filter(Boolean))await tx.$executeRawUnsafe(statement);
  await tx.$executeRaw`INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (${randomUUID()},${checksum},now(),${migration},NULL,NULL,now(),1)`;
  console.log('[checkout-storage] Created two empty tables and indexes; recorded migration; existing records untouched');
 },{timeout:30000});
}catch(error){console.error('[checkout-storage] Failed safely:',error.code||error.name);process.exitCode=1;}
finally{await db.$disconnect();}
