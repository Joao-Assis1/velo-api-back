import { extractLadvFields } from './ladv-ocr';

describe('extractLadvFields', () => {
  it('returns FAIL when text is empty', () => {
    const r = extractLadvFields('', 80);
    expect(r.status).toBe('FAIL');
    expect(r.ladvNumber).toBeNull();
  });

  it('returns FAIL when confidence is below 50', () => {
    const r = extractLadvFields(
      'LADV nº 123456789 emitida pelo DETRAN-MS em 10/05/2026',
      40,
    );
    expect(r.status).toBe('FAIL');
  });

  it('returns FAIL when none of the LADV keywords are present', () => {
    const r = extractLadvFields(
      'CERTIDÃO DE NASCIMENTO\nNome: João Silva\nMãe: Maria Silva',
      90,
    );
    expect(r.status).toBe('FAIL');
  });

  it('returns NEEDS_REVIEW when keywords match but the LADV number cannot be parsed', () => {
    const r = extractLadvFields(
      'LICENÇA DE APRENDIZAGEM\nDETRAN-MS\nEmitida em 10/05/2026 Válida até 10/11/2026',
      80,
    );
    expect(r.status).toBe('NEEDS_REVIEW');
    expect(r.ladvNumber).toBeNull();
    expect(r.issuedAt?.toISOString().startsWith('2026-05-10')).toBe(true);
    expect(r.validUntil?.toISOString().startsWith('2026-11-10')).toBe(true);
  });

  it('returns PASS when keywords + number + both dates are parsed', () => {
    const r = extractLadvFields(
      'LADV nº LADV-MS-12345678\nLICENÇA DE APRENDIZAGEM\nDETRAN-MS\nEmitida em 10/05/2026 Válida até 10/11/2026',
      85,
    );
    expect(r.status).toBe('PASS');
    expect(r.ladvNumber).toBe('LADV-MS-12345678');
    expect(r.confidence).toBe(85);
  });

  it('parses dates in YYYY-MM-DD format too', () => {
    const r = extractLadvFields(
      'LADV nº LADV-MS-98765\nLICENÇA APRENDIZAGEM DETRAN\nEmissão: 2026-05-10  Validade: 2026-11-10',
      80,
    );
    expect(r.status).toBe('PASS');
    expect(r.issuedAt?.toISOString().startsWith('2026-05-10')).toBe(true);
  });

  it('returns NEEDS_REVIEW when validUntil is in the past', () => {
    const r = extractLadvFields(
      'LADV nº LADV-MS-99999\nLICENÇA DE APRENDIZAGEM DETRAN\nEmitida em 10/01/2020 Válida até 10/07/2020',
      85,
    );
    expect(r.status).toBe('NEEDS_REVIEW');
    expect(r.validUntil?.toISOString().startsWith('2020-07-10')).toBe(true);
  });

  // Real-world format — pure numeric LADV number (DETRAN-MS)
  it('extracts pure-numeric LADV number (DETRAN-MS real format)', () => {
    const r = extractLadvFields(
      'LICENÇA DE APRENDIZAGEM DE DIREÇÃO VEICULAR\nLADV Nº 1490188\nDETRAN-MS\nEmissão: 10/05/2026 Validade: 10/11/2026',
      80,
    );
    expect(r.status).toBe('PASS');
    expect(r.ladvNumber).toBe('1490188');
  });

  // OCR misreads Nº as No (letter O) — very common with Tesseract
  it('extracts number when OCR reads Nº as No', () => {
    const r = extractLadvFields(
      'LICENÇA DE APRENDIZAGEM\nLADV No 1490188\nDETRAN-MS\nEmissão: 10/05/2026 Validade: 10/11/2026',
      75,
    );
    expect(r.status).toBe('PASS');
    expect(r.ladvNumber).toBe('1490188');
  });

  // Date labels: EXPEDIÇÃO / VENCIMENTO variants used by some DETRANs
  it('parses dates with EXPEDIÇÃO and VENCIMENTO label variants', () => {
    const r = extractLadvFields(
      'LADV Nº 9876543\nLICENÇA DE APRENDIZAGEM DETRAN\nExpedição: 10/05/2026 Vencimento: 10/11/2026',
      80,
    );
    expect(r.status).toBe('PASS');
    expect(r.issuedAt?.toISOString().startsWith('2026-05-10')).toBe(true);
    expect(r.validUntil?.toISOString().startsWith('2026-11-10')).toBe(true);
  });

  // Date labels: EXPEDIDA EM / VENCE EM variants
  it('parses dates with EXPEDIDA EM and VENCE EM label variants', () => {
    const r = extractLadvFields(
      'LADV Nº 1111111\nLICENÇA APRENDIZAGEM DETRAN\nExpedida em 10/05/2026 Vence em 10/11/2026',
      80,
    );
    expect(r.status).toBe('PASS');
    expect(r.issuedAt?.toISOString().startsWith('2026-05-10')).toBe(true);
  });
});
