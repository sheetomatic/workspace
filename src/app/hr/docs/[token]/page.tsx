import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmployeeDocsPublicForm } from "@/components/hr/employee-docs-public-form";
import { getEmployeeDocsLinkContext } from "@/lib/hr/docs-link";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
  title: "Upload HR documents",
  robots: { index: false, follow: false },
};

export default async function PublicEmployeeDocsPage({ params }: PageProps) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const ctx = await getEmployeeDocsLinkContext(token);
  if (!ctx) {
    notFound();
  }

  const documents = await prisma.employeeDocument.findMany({
    where: {
      organizationId: ctx.profile.organizationId,
      employeeProfileId: ctx.profile.id,
    },
    select: {
      id: true,
      docType: true,
      fileName: true,
      fileSize: true,
    },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <EmployeeDocsPublicForm
      token={token}
      organizationName={ctx.profile.organization.name}
      employeeName={ctx.profile.user.name?.trim() || ctx.profile.user.email}
      onboardingStatus={ctx.profile.onboardingStatus}
      educationSummary={ctx.checklist.educationSummary}
      experienceSummary={ctx.checklist.experienceSummary}
      items={ctx.checklist.items}
      documents={documents}
    />
  );
}
