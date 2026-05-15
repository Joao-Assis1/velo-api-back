export interface CnhValidationResult {
  valid: boolean;
  normalized: string | null;
}

export function validateCnh(input: string): CnhValidationResult {
  if (!input || typeof input !== 'string') {
    return { valid: false, normalized: null };
  }
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 11) return { valid: false, normalized: null };
  if (/^(\d)\1{10}$/.test(digits)) return { valid: false, normalized: null };

  let dsc = 0;
  let sum = 0;
  for (let i = 0, j = 9; i < 9; i++, j--) {
    sum += parseInt(digits[i], 10) * j;
  }
  let d1 = sum % 11;
  if (d1 >= 10) {
    d1 = 0;
    dsc = 2;
  }

  sum = 0;
  for (let i = 0, j = 1; i < 9; i++, j++) {
    sum += parseInt(digits[i], 10) * j;
  }
  const r = sum % 11;
  const d2 = r >= 10 ? 0 : r - dsc < 0 ? r - dsc + 11 : r - dsc;

  const expected = `${d1}${d2}`;
  const actual = digits.substring(9, 11);
  const valid = expected === actual;
  return { valid, normalized: valid ? digits : null };
}
