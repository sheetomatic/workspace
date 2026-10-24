/** UI timeout and stale-result isolation. This does not cancel the server action. */
export function startDrawerRequest<T>(
  load: () => Promise<T | null>,
  resolve: (value: T) => void,
  reject: (message: string) => void,
  timeoutMs = 15000,
) {
  let active = true;
  const timer = setTimeout(() => {
    active = false;
    reject("This lead is taking too long to load. Please retry.");
  }, timeoutMs);
  void Promise.resolve().then(load).then((value) => {
    if (!active) return;
    clearTimeout(timer);
    active = false;
    if (!value) reject("This lead is unavailable or you no longer have access.");
    else resolve(value);
  }).catch(() => {
    if (!active) return;
    clearTimeout(timer);
    active = false;
    reject("Could not load this lead. Please retry, or sign in again if your session expired.");
  });
  return () => { active = false; clearTimeout(timer); };
}
