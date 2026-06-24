import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FmsSubmitForm } from "@/components/saas/fms-submit-form";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { canManageFms, canSubmitFmsForm } from "@/lib/fms/access";
import { getFmsForm } from "@/lib/fms/queries";

type PageProps = {
  params: Promise<{ formId: string }>;
};

export default async function FmsFormSubmitPage({ params }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const { formId } = await params;
  const form = await getFmsForm(formId, user.organizationId);

  if (!form) {
    notFound();
  }

  if (form.status !== "ACTIVE") {
    redirect(`/app/fms/forms/${form.id}`);
  }

  if (!canSubmitFmsForm(user)) {
    redirect(`/app/fms/forms/${form.id}`);
  }

  const isAdmin = canManageFms(user.role);

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title={`Submit: ${form.name}`}
        description="Your answers create a new FMS job when the linked workflow is live."
        actions={
          isAdmin ? (
            <Link
              href={`/app/fms/forms/${form.id}?from=setup`}
              className="btn-secondary btn-sm"
            >
              Manage form
            </Link>
          ) : (
            <Link href={`/app/fms/forms/${form.id}`} className="btn-secondary btn-sm">
              Back to form details
            </Link>
          )
        }
      />
      <FmsSubmitForm formId={form.id} formName={form.name} fields={form.fields} />
    </div>
  );
}
