export async function withRetry<T>(fn: () => Promise<T>, opts: { attempts?: number; minDelayMs?: number; factor?: number } = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const minDelayMs = opts.minDelayMs ?? 500;
  const factor = opts.factor ?? 2;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === attempts - 1) break;
      const delay = minDelayMs * Math.pow(factor, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
