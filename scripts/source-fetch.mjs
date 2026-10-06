// Bounded retries only for idempotent public reads and transient failures.
export async function fetchSource(url, options = {}, fetcher = globalThis.fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  const retryable = !options.method || options.method.toUpperCase() === 'GET';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetcher(url, {...options, signal: options.signal || AbortSignal.timeout(15000)});
      if (attempt === 0 && retryable && [408,429,500,502,503,504].includes(response.status)) {
        await response.body?.cancel();
        await wait(1500);
        continue;
      }
      return response;
    } catch (error) {
      if (attempt || !retryable || options.signal?.aborted) throw error;
      await wait(1500);
    }
  }
}
