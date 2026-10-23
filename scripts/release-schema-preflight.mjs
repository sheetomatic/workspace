// Read-only compatibility gate. Never runs migrations or reads customer records.
import { PrismaClient, Prisma } from '@prisma/client';
if (!process.env.DATABASE_URL) throw Error('Release blocked: DATABASE_URL unavailable');
const db = new PrismaClient({ log: [] });
try {
  const columns = await db.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`;
  const actual = new Set(columns.map(x => `${x.table_name}.${x.column_name}`));
  const missing = [];
  for (const model of Prisma.dmmf.datamodel.models) {
    for (const field of model.fields.filter(f => f.kind !== 'object')) {
      const name = `${model.dbName || model.name}.${field.dbName || field.name}`;
      if (!actual.has(name)) missing.push(name);
    }
  }
  const enumRows = await db.$queryRaw`SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'`;
  const enums = new Set(enumRows.map(x => `${x.typname}.${x.enumlabel}`));
  for (const item of Prisma.dmmf.datamodel.enums) for (const value of item.values) {
    const name = `${item.dbName || item.name}.${value.dbName || value.name}`;
    if (!enums.has(name)) missing.push(`enum:${name}`);
  }
  if (missing.length) {
    console.error('[release-schema] Missing schema identifiers:', JSON.stringify(missing));
    throw Error(`Release blocked: ${missing.length} missing schema identifiers; no migrations performed`);
  }
  console.log('[release-schema] All generated model columns and enum values present; read-only check passed');
} catch (error) {
  // Provider errors may contain connection strings: only emit safe error codes.
  if (!String(error.message).startsWith('Release blocked:')) {
    console.error('[release-schema] Read failed:', error.code || error.name);
    process.exitCode = 1;
  } else { console.error(error.message); process.exitCode = 1; }
} finally { await db.$disconnect(); }
