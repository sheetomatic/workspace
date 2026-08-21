import AppBuilderStudio from "@/components/app-builder/App";
import { isAppBuilderGoogleConfigured } from "@/lib/app-builder/google";
import { requireSession } from "@/lib/require-session";

export default async function AppBuilderStudioPage() {
  await requireSession();
  return <AppBuilderStudio googleAuthReady={isAppBuilderGoogleConfigured()} />;
}
