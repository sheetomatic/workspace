/** IndexedDB outbox for the driver page. No server imports. */

const DB_NAME = "sheetomatic-fleet";
const STORE = "outbox";

export type OutboxPoint = {
  clientEventId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  fuelLevelLiters: number;
  rpm: number | null;
  engineState: "OFF" | "IDLING" | "MOVING";
  networkStatus: "ONLINE" | "OFFLINE";
  recordedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clientEventId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueTelemetry(point: OutboxPoint): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(point);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readOutbox(): Promise<OutboxPoint[]> {
  const db = await openDb();
  const rows = await new Promise<OutboxPoint[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as OutboxPoint[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows;
}

export async function removeOutbox(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
