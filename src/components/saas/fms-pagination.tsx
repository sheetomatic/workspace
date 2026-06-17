import Link from "next/link";

export function FmsPagination({
  page,
  totalPages,
  total,
  searchParams,
  basePath,
  label = "pipelines",
  pageParam = "page",
}: {
  page: number;
  totalPages: number;
  total: number;
  searchParams: Record<string, string | undefined>;
  basePath: string;
  label?: string;
  pageParam?: string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== pageParam) {
        params.set(key, value);
      }
    }
    if (nextPage > 1) {
      params.set(pageParam, String(nextPage));
    }
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <nav aria-label="FMS pages" className="ws-task-pagination ws-sf-pagination">
      <span>
        Page {page} of {totalPages} ({total} {label})
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
