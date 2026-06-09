export function getLoginBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "") ||
    "https://sheetomatic.com"
  );
}
