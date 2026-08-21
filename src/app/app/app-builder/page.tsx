import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppBuilderStudio from "@/components/app-builder/App";
import { isAppBuilderGoogleConfigured } from "@/lib/app-builder/google";
import { requireSession } from "@/lib/require-session";
import { parseHost } from "@/lib/subdomain";
import { APP_BUILDER_STUDIO_HREF } from "@/lib/workspace-auth-links";

export default async function AppBuilderStudioPage() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (parseHost(host).kind === "marketing") {
    redirect(APP_BUILDER_STUDIO_HREF);
  }

  await requireSession();
  return <AppBuilderStudio googleAuthReady={isAppBuilderGoogleConfigured()} />;
}
