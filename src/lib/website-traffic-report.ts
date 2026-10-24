const DAY = 86_400_000;
const IST = 19_800_000;
export function trafficWindow(days: number, now: Date) {
  return new Date(Math.floor((now.getTime() + IST) / DAY) * DAY - IST - (days - 1) * DAY);
}
export function trafficDays(rows: { day: string; views: bigint | number }[], days: number, now: Date) {
  const counts = new Map(rows.map(row => [row.day, Number(row.views)]));
  const start = trafficWindow(days, now).getTime();
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(start + index * DAY + IST).toISOString().slice(0, 10);
    return { day, views: counts.get(day) ?? 0 };
  });
}
