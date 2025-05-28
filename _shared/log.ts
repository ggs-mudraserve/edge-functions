// deno-lint-ignore-file no-explicit-any
// Shared structured logger (v1.2)
// Severity‑aware, request‑correlated, test‑silent.

/**
 * Log entry helper.
 *
 * @param evt   – short event key, snake_case
 * @param extra – additional structured payload
 * @param opts  – { level?: 'info'|'warn'|'error'|'debug', reqId?: string }
 */
export function log(
  evt: string,
  extra: Record<string, unknown> = {},
  opts: { level?: 'info' | 'warn' | 'error' | 'debug'; reqId?: string } = {},
) {
  // Skip noisy logs in unit tests / local tooling
  if (Deno.env.get("DENO_ENV") === "test") return;

  const { level = 'info', reqId } = opts;
  const logEntry: Record<string, unknown> = {
    evt,
    ts: new Date().toISOString(),
    level,
    reqId,
    ...extra,
  };

  let payload: string;
  try {
    payload = JSON.stringify(logEntry);
  } catch (_err) {
    payload = JSON.stringify({ evt: 'log_stringify_error', ts: new Date().toISOString(), level: 'error' });
  }

  switch (level) {
    case 'error':
      console.error(payload);
      break;
    case 'warn':
      console.warn(payload);
      break;
    case 'debug':
      console.debug(payload);
      break;
    default:
      console.log(payload);
  }
}