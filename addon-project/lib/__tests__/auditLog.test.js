const { auditLog } = require('../auditLog');

describe('lib/auditLog.js', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('returns an object with ts, event, and details', () => {
    const entry = auditLog('login_success', { authKey: 'key1', ip: '1.2.3.4' });

    expect(entry).toHaveProperty('ts');
    expect(entry).toHaveProperty('event', 'login_success');
    expect(entry).toHaveProperty('details');
    expect(entry.details.authKey).toBe('key1');
    expect(entry.details.ip).toBe('1.2.3.4');
  });

  test('logs to console with [AUDIT] prefix', () => {
    auditLog('logout', {});

    expect(consoleSpy).toHaveBeenCalledWith('[AUDIT]', expect.any(String));
  });

  test('serialises entry as JSON in the log', () => {
    const entry = auditLog('login_failed', { reason: 'bad password' });

    const loggedJson = JSON.parse(consoleSpy.mock.calls[0][1]);
    expect(loggedJson.event).toBe('login_failed');
    expect(loggedJson.details.reason).toBe('bad password');
  });

  test('includes meta fields in details', () => {
    const entry = auditLog('addon_collection_changed', {
      authKey: 'key2',
      meta: { addonCount: 5, category: 'movies' },
    });

    expect(entry.details.addonCount).toBe(5);
    expect(entry.details.category).toBe('movies');
  });

  test('omits undefined details fields', () => {
    const entry = auditLog('session_created', {});

    expect(entry.details.authKey).toBeUndefined();
    expect(entry.details.ip).toBeUndefined();
    expect(entry.details.reason).toBeUndefined();
  });

  test('handles all standard event types', () => {
    const events = ['login_success', 'login_failed', 'logout', 'addon_collection_changed', 'session_created', 'session_auth_key'];

    for (const event of events) {
      const entry = auditLog(event, {});
      expect(entry.event).toBe(event);
    }
  });

  test('defaults details to empty object when not provided', () => {
    const entry = auditLog('login_success');

    expect(entry.details).toEqual({});
  });
});
