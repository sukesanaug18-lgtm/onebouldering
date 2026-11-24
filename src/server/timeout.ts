import "server-only";

/** Firestore retries for a long time when it cannot connect; give up after 5s. */
export function withTimeout<T>(p: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), ms)),
  ]);
}
