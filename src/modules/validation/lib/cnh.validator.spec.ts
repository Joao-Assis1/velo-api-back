import { validateCnh } from './cnh.validator';

describe('validateCnh', () => {
  it('rejects empty input', () => {
    expect(validateCnh('').valid).toBe(false);
    expect(validateCnh('   ').valid).toBe(false);
  });

  it('rejects input that is not 11 digits after stripping non-digits', () => {
    expect(validateCnh('1234567890').valid).toBe(false); // 10 digits
    expect(validateCnh('123456789012').valid).toBe(false); // 12 digits
    expect(validateCnh('abcdefghijk').valid).toBe(false);
  });

  it('rejects all-equal sequences (00000000000, 11111111111, ...)', () => {
    for (let d = 0; d < 10; d++) {
      const repeated = String(d).repeat(11);
      expect(validateCnh(repeated).valid).toBe(false);
    }
  });

  it('accepts a known valid CNH number', () => {
    expect(validateCnh('02650306461').valid).toBe(true);
  });

  it('rejects a CNH with wrong check digits', () => {
    expect(validateCnh('02650306462').valid).toBe(false);
  });

  it('accepts CNH with mask and normalizes to digits-only', () => {
    const result = validateCnh('026.503.064-61');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('02650306461');
  });
});
