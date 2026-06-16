import Link from "next/link";
import { FmsFormBuilder } from "@/components/saas/fms-form-builder";
import { requireSession } from "@/lib/require-session";
import { canManageFms } from "@/lib/fms/access";

export default async function NewFmsFormPage() {
  const user = await requireSession("ADMIN", { module: "FMS" });
  if (!canManageFms(user.role)) {
    return null;
  }

  return (
    <div className="saas-page ws-fms-page ws-fms-sf ws-fms-jotform-page">
      <div className="ws-fms-jf-page-bar">
        <Link href="/app/fms" className="ws-fms-jf-back">
          Back to FMS
        </Link>
      </div>
      <FmsFormBuilder mode="create" />
    </div>
  );
}
