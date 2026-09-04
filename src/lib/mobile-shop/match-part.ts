export type MatchablePart = {
  id: string;
  name: string;
  qty: number;
};

function fold(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match a PART in stock: device+jobType, then exact jobType, then name includes jobType. */
export function matchPartForRepair(
  parts: MatchablePart[],
  deviceName: string,
  jobType: string,
): MatchablePart | null {
  const inStock = parts.filter((part) => part.qty > 0);
  if (inStock.length === 0) return null;

  const device = fold(deviceName);
  const job = fold(jobType);

  if (device && job) {
    const deviceAndJob = inStock.find((part) => {
      const name = fold(part.name);
      return name.includes(device) && name.includes(job);
    });
    if (deviceAndJob) return deviceAndJob;
  }

  if (!job || job === "other") return null;

  const exact = inStock.find((part) => fold(part.name) === job);
  if (exact) return exact;

  return inStock.find((part) => fold(part.name).includes(job)) ?? null;
}
