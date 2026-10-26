// Read-only release evidence; emits aggregate counts only, never lead contacts.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ log: [] });
try {
  await db.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const orgs = await tx.organization.findMany({where:{isPrimary:true},select:{id:true}});
    if(orgs.length !== 1) throw Error('Primary workspace is ambiguous');
    const now = new Date();
    const month = new Date(now.getTime()+330*60000).toISOString().slice(0,7);
    const start = new Date(`${month}-01T00:00:00+05:30`);
    const common = {organizationId:orgs[0].id,archivedAt:null,mergedIntoId:null,
      AND:[{phone:{not:null}},{NOT:{phone:''}}]};
    const current = { ...common, status:{not:'LOST'}, OR:[
      {capturedAt:{gte:start,lte:now}},
      {capturedAt:null,createdAt:{gte:start,lte:now}},
    ]};
    const older = {...common,OR:[{capturedAt:{lt:start}},
      {capturedAt:null,createdAt:{lt:start}},{status:'LOST'}]};
    const leads=await tx.inboundLead.count({where:current});
    const nextTime=await tx.inboundLead.count({where:older});
    console.log(`[crm-month-preflight] PASS read-only month=${month} leads=${leads} nextTime=${nextTime}`);
  });
} finally { await db.$disconnect(); }
