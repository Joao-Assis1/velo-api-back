import { MockValidationProvider } from './mock-validation.provider';

describe('MockValidationProvider', () => {
  let provider: MockValidationProvider;

  beforeEach(() => {
    provider = new MockValidationProvider();
  });

  describe('validateCnh', () => {
    it('returns VALID for the whitelisted demo CNH', async () => {
      const result = await provider.validateCnh('02650306461', '12345678909');
      expect(result.valid).toBe(true);
      expect(result.status).toBe('VALID');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('returns EXPIRED for the scripted expired CNH', async () => {
      const result = await provider.validateCnh('99999999999', '12345678909');
      expect(result.valid).toBe(false);
      expect(result.status).toBe('EXPIRED');
    });

    it('returns NOT_FOUND for unknown CNH', async () => {
      const result = await provider.validateCnh('11122233344', '12345678909');
      expect(result.valid).toBe(false);
      expect(result.status).toBe('NOT_FOUND');
    });
  });

  describe('validateRenach', () => {
    it('returns OPEN for valid RENACH in UF+9digits format', async () => {
      const r = await provider.validateRenach('SP123456789', '12345678909');
      expect(r.valid).toBe(true);
      expect(r.processStatus).toBe('OPEN');
    });

    it('returns OPEN for MS UF prefix', async () => {
      const r = await provider.validateRenach('MS000000001', '12345678909');
      expect(r.valid).toBe(true);
      expect(r.processStatus).toBe('OPEN');
    });

    it('returns NOT_FOUND for old RNC- format', async () => {
      const r = await provider.validateRenach('RNC-2026-00001', '12345678909');
      expect(r.valid).toBe(false);
      expect(r.processStatus).toBe('NOT_FOUND');
    });

    it('returns NOT_FOUND for missing UF prefix', async () => {
      const r = await provider.validateRenach('123456789', '12345678909');
      expect(r.valid).toBe(false);
      expect(r.processStatus).toBe('NOT_FOUND');
    });

    it('returns NOT_FOUND for UF with fewer than 9 digits', async () => {
      const r = await provider.validateRenach('SP12345678', '12345678909');
      expect(r.valid).toBe(false);
      expect(r.processStatus).toBe('NOT_FOUND');
    });

    it('returns NOT_FOUND for malformed input', async () => {
      const r = await provider.validateRenach('XXX', '12345678909');
      expect(r.valid).toBe(false);
      expect(r.processStatus).toBe('NOT_FOUND');
    });
  });

  describe('matchFaceWithCnh', () => {
    it('returns deterministic similarity above the threshold for any image', async () => {
      const r = await provider.matchFaceWithCnh('12345678909', 'base64data');
      expect(r.similarity).toBeGreaterThanOrEqual(0.85);
      expect(r.match).toBe(true);
    });
  });
});
