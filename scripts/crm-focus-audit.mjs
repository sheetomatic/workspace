// Bounded read-only reconciliation. Never emits contact details or credentials.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({log:[]});
try {
  await db.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const orgs = await tx.organization.findMany({where:{isPrimary:true},select:{id:true,name:true}});
    if(orgs.length!==1)throw Error('Primary workspace is ambiguous');
    const org=orgs[0];
    const members=await tx.membership.findMany({where:{organizationId:org.id,deactivatedAt:null,user:{name:{contains:'Sumit',mode:'insensitive'}}},select:{userId:true,role:true,modules:true,user:{select:{name:true,phone:true,email:true}}}});
    console.log('[crm-focus-audit] assignee '+JSON.stringify(members.map(m=>({userId:m.userId,name:m.user.name,role:m.role,modules:m.modules,hasPhone:Boolean(m.user.phone),hasEmail:Boolean(m.user.email)}))));
    const names=['Sunny','Hingorani','Shraddha','Blue Violet','Blueviolet','Gurpreet','Maan','Kavlin'];
    const projects=await tx.inboundLead.findMany({where:{organizationId:org.id,mergedIntoId:null,OR:names.flatMap(value=>[{name:{contains:value,mode:'insensitive'}},{company:{contains:value,mode:'insensitive'}}])},select:{id:true,name:true,company:true,status:true,projectStatus:true,archivedAt:true,assignedToId:true,salesOrders:{select:{id:true,status:true}}},take:40});
    console.log('[crm-focus-audit] project candidates '+JSON.stringify(projects));
    const demos=await tx.inboundLead.findMany({where:{organizationId:org.id,mergedIntoId:null,status:{in:['TRIAL','DEMO_SCHEDULED']}},select:{id:true,name:true,company:true,status:true,archivedAt:true},take:30});
    console.log('[crm-focus-audit] demo candidates '+JSON.stringify(demos));
    const counts=await tx.inboundLead.groupBy({by:['status'],where:{organizationId:org.id,mergedIntoId:null},_count:true});
    console.log('[crm-focus-audit] status counts '+JSON.stringify(counts));
    console.log('[crm-focus-audit] PASS read-only; no reassignment, archival or alerts');
  });
}catch(error){console.error('[crm-focus-audit] FAILED '+(error?.code || 'read/check failure'));process.exitCode=1;}finally{await db.$disconnect();}
