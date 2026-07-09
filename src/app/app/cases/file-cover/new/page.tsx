import Link from "next/link";
import { FileCoverWizard } from "@/components/legal/file-cover-wizard";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import { requireLegalCasesSession } from "@/lib/require-session";
import "@/components/legal/legal-cases.css";

export default async function NewFileCoverPage() {
  const user = await requireLegalCasesSession();
  if (!isLegalAdmin(user)) {
    return (
      <div className="saas-page">
        <p>Only managers and admins can create file covers.</p>
        <Link href="/app/cases">Back to cases</Link>
      </div>
    );
  }

  return (
    <div className="saas-page">
      <p style={{ marginBottom: "1rem" }}>
        <Link className="btn-ghost" href="/app/cases">
          Back to cases
        </Link>
      </p>
      <FileCoverWizard />
    </div>
  );
}
