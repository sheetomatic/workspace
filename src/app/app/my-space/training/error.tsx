"use client";

import { TrainingAdminError } from "@/components/saas/training-admin-error";

export default function MySpaceTrainingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <TrainingAdminError error={error} reset={reset} />;
}
