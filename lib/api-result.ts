export type ApiResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

export function ok<T>(data: T): ApiResult<T> {
  return { success: true, data, error: null };
}

export function fail(error: string): ApiResult<never> {
  return { success: false, data: null, error };
}

export function errorMessage(err: unknown, fallback = 'SERVER_ERROR'): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'string') return err || fallback;
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}
