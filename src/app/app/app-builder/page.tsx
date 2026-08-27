import AppBuilderStudio from "@/components/app-builder/App";
import { isAppBuilderGoogleConfigured } from "@/lib/app-builder/google";
import { loadAppBuilderStudio } from "@/lib/app-builder/persist";
import { requireSession } from "@/lib/require-session";

export default async function AppBuilderStudioPage() {
  const user = await requireSession();
  const initial = await loadAppBuilderStudio(user.organizationId);
  return (
    <AppBuilderStudio
      googleAuthReady={isAppBuilderGoogleConfigured()}
      initial={initial}
    />
  );
}
