/** Retry only transactions PostgreSQL has rolled back for a write conflict. */
export async function retryTransaction<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= 2 || !error || typeof error !== "object" || !("code" in error) || error.code !== "P2034")
        throw error;
    }
  }
}
