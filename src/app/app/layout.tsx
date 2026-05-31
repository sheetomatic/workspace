import "@/components/saas/workspace-theme.css";
import { redirect } from "next/navigation";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { SaasShell } from "@/components/saas/saas-shell";
import { listOrganizationsForUser } from "@/lib/auth-orgs";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

export const metadata = {
  title: "Workspace | Sheetomatic",
  description: "Client business control workspace for Sheetomatic customers.",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await requireSession();
  const [organization, organizations] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: sessionUser.organizationId },
    }),
    listOrganizationsForUser(sessionUser.id),
  ]);

  if (!organization) {
    redirect(
      "/api/auth/signout?callbackUrl=" +
        encodeURIComponent("/login?error=workspace"),
    );
  }

  const user = {
    ...sessionUser,
    organizationName: organization.name,
  };

  return (
    <AuthSessionProvider>
      <SaasShell organizations={organizations} user={user}>
        {children}
      </SaasShell>
    </AuthSessionProvider>
  );
}
