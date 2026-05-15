import { idempotencyKey } from './idempotency';

describe('idempotencyKey', () => {
  it('returns the same key for the same (subject, action) pair', () => {
    const a = idempotencyKey('pay-1', 'release');
    const b = idempotencyKey('pay-1', 'release');
    expect(a).toBe(b);
  });

  it('returns different keys for different actions on the same subject', () => {
    expect(idempotencyKey('pay-1', 'release')).not.toBe(
      idempotencyKey('pay-1', 'refund'),
    );
  });

  it('returns different keys for different subjects', () => {
    expect(idempotencyKey('pay-1', 'charge')).not.toBe(
      idempotencyKey('pay-2', 'charge'),
    );
  });

  it('produces a hex string of at least 32 characters', () => {
    const k = idempotencyKey('pay-1', 'charge');
    expect(k).toMatch(/^[a-f0-9]{32,}$/);
  });
});
