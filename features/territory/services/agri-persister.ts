// Lightweight tracing client for supervisor actions
export async function traceAction(payload: { territoryId: string; action: string; meta?: any }) {
  try {
    // fire-and-forget to server-side trace endpoint
    await fetch('/api/agri/trace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // non-blocking - log client-side for debugging
    // eslint-disable-next-line no-console
    console.error('traceAction failed', err);
  }
}

export default { traceAction };
