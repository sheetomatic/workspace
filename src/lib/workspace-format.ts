export function formatPendingAge(pendingSince: Date) {
  const hours = Math.floor((Date.now() - pendingSince.getTime()) / 3600000);
  if (hours < 1) {
    return "Just now";
  }
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatDashboardDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
