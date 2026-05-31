export function isNextRedirect(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest ?? "").startsWith(
      "NEXT_REDIRECT",
    )
  ) {
    return true;
  }
  // Next.js also throws redirect errors with this message shape.
  if (error instanceof Error && error.message === "NEXT_REDIRECT") {
    return true;
  }
  return false;
}
