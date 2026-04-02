const { logEvent } = require('../logger');

describe('lib/logger', () => {
  beforeEach(() => {
    delete process.env.LOG_INGEST_URL;
    jest.restoreAllMocks();
  });

  test('logs to console.log for non-error levels', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await logEvent('info', 'test_event', { key: 'value' });

    expect(spy).toHaveBeenCalledWith('[LOG]', expect.objectContaining({
      level: 'info',
      event: 'test_event',
      meta: { key: 'value' },
      ts: expect.any(String),
    }));
    spy.mockRestore();
  });

  test('logs to console.error for error level', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    await logEvent('error', 'critical_failure', { code: 500 });

    expect(spy).toHaveBeenCalledWith('[LOG]', expect.objectContaining({
      level: 'error',
      event: 'critical_failure',
      meta: { code: 500 },
    }));
    spy.mockRestore();
  });

  test('payload includes ISO timestamp', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await logEvent('info', 'ts_test');

    const payload = spy.mock.calls[0][1];
    expect(payload.ts).toBeDefined();
    expect(typeof payload.ts).toBe('string');
    expect(new Date(payload.ts).getTime()).not.toBeNaN();
    spy.mockRestore();
  });

  test('defaults meta to empty object when not provided', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await logEvent('info', 'no_meta');

    const payload = spy.mock.calls[0][1];
    expect(payload.meta).toEqual({});
    spy.mockRestore();
  });

  test('sends to remote URL when LOG_INGEST_URL is set', async () => {
    process.env.LOG_INGEST_URL = 'https://logs.example.com/ingest';
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await logEvent('info', 'remote_test');

    expect(fetchSpy).toHaveBeenCalledWith('https://logs.example.com/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.any(String),
    });

    fetchSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  test('does not crash when remote logging fails', async () => {
    process.env.LOG_INGEST_URL = 'https://logs.example.com/ingest';
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await expect(logEvent('info', 'fail_test')).resolves.toBeUndefined();

    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  test('does not send to remote when LOG_INGEST_URL is not set', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await logEvent('info', 'no_remote');

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
