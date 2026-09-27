/**
 * Erreur « capturée » typée : remplace `catch (e: any)` sans changer le code qui lit `e.message`, `e.code`…
 * Les propriétés non standard (code SQL, status, détails de validation) restent accessibles en `unknown`.
 */
export type ErrorLike = Error & { code?: unknown; status?: unknown; [key: string]: unknown };

export function asError(value: unknown): ErrorLike {
  if (value instanceof Error) return value as ErrorLike;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const message = typeof record.message === 'string' ? record.message : JSON.stringify(value);
    return Object.assign(new Error(message), record) as ErrorLike;
  }
  return new Error(String(value)) as ErrorLike;
}

/** Crée une Error portant un `code` (et des champs additionnels) sans recourir à `as any`. */
export function codedError(code: string, message: string = code, extra: Record<string, unknown> = {}): ErrorLike {
  return Object.assign(new Error(message), { code }, extra) as ErrorLike;
}
