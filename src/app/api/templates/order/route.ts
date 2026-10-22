/** Legacy single-item checkout retired; existing order proof/admin routes remain available. */
export async function POST() {
  return Response.json(
    {
      error:
        "Please refresh /templates and use the cart checkout with GST billing.",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
