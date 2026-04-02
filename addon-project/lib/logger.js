async function sendRemoteLog(payload) {
  const ingestUrl = process.env.LOG_INGEST_URL;
  if (!ingestUrl) return;

  try {
    await fetch(ingestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore remote logging failures
  }
}

async function logEvent(level, event, meta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    meta,
  };

  if (level === 'error') console.error('[LOG]', payload);
  else console.log('[LOG]', payload);

  await sendRemoteLog(payload);
}

module.exports = { logEvent };
