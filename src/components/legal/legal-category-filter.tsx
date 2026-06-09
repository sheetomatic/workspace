"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function LegalCategoryFilter({
  categories,
  current,
}: {
  categories: string[];
  current?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (categories.length === 0) return null;

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("category", value);
    } else {
      params.delete("category");
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }

  return (
    <label className="legal-category-filter">
      Case category
      <select
        defaultValue={current ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>
  );
}
