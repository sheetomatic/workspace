const PATHS: Record<string, string> = {
  calendar:
    "M5 8h14M8 4v4M16 4v4M6 6h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm1 7h3v3H7z",
  deck: "M7 8h10v11H7zM9 6h10v2H9zM11 4h10v2H11z",
  table: "M5 6h14v12H5zM5 10h14M5 14h14M10 6v12",
  gallery: "M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z",
  detail: "M7 4h10v16H7zM10 8h4M10 12h4M10 16h3",
  map: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zm0-8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
  chart: "M5 19h14M8 16V9M12 16V6M16 16v-4",
  dashboard: "M5 5h6v8H5zM13 5h6v5h-6zM13 12h6v7h-6zM5 15h6v4H5z",
  form: "M6 4h12v16H6zM9 8h6M9 12h6M9 16h4",
  card: "M5 7h14v10H5zM8 10h5M8 13h8",
  menu: "M6 6h4v4H6zM14 6h4v4h-4zM6 14h4v4H6zM14 14h4v4h-4z",
  users: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 19a4 4 0 0 1 8 0M12 19a4 4 0 0 1 8 0",
  leads: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0",
  cart: "M6 7h15l-2 8H8L6 7zm0 0L5 4H3M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  box: "M4 8l8-4 8 4v8l-8 4-8-4V8zm0 0l8 4 8-4",
  cash: "M4 7h16v10H4zM4 10c2 2 4 2 6 0s4-2 6 0 4 2 6 0M12 14.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  check: "M5 12l5 5L20 7",
  file: "M7 3h7l5 5v13H7zM14 3v5h5",
  home: "M4 11l8-7 8 7v9H4zM10 20v-6h4v6",
};

export function ViewGlyph({
  id,
  size = 20,
}: {
  id: string;
  size?: number;
}) {
  const d = PATHS[id] || PATHS.users;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
