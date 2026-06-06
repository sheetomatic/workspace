import Link from "next/link";

export function TaskPagination({
  page,
  totalPages,
  total,
  searchParams,
}: {
  page: number;
  totalPages: number;
  total: number;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return null;
  }

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") {
        params.set(key, value);
      }
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    const query = params.toString();
    return query ? `/app/tasks?${query}` : "/app/tasks";
  }

  return (
    <nav aria-label="Task pages" className="ws-task-pagination ws-sf-pagination">
      <span>
        Page {page} of {totalPages} ({total} tasks)
      </span>
      <div className="ws-task-pagination-actions">
        {page > 1 ? (
          <Link className="btn-cta btn-secondary btn-compact" href={hrefFor(page - 1)}>
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link className="btn-cta btn-secondary btn-compact" href={hrefFor(page + 1)}>
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
