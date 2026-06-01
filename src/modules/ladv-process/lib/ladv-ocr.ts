export type LadvOcrStatus = 'PASS' | 'NEEDS_REVIEW' | 'FAIL';

export interface LadvOcrResult {
  ladvNumber: string | null;
  issuedAt: Date | null;
  validUntil: Date | null;
  confidence: number;
  status: LadvOcrStatus;
}

const KEYWORDS = ['LADV', 'LICENÇA', 'LICENCA', 'APRENDIZAGEM', 'DETRAN'];

const MIN_CONFIDENCE = 50;

function parseDate(value: string): Date | null {
  // Supports DD/MM/YYYY and YYYY-MM-DD
  let m = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) {
    return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  }
  m = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }
  return null;
}

function findFirstDateAfter(text: string, anchorRegex: RegExp): Date | null {
  const match = anchorRegex.exec(text);
  if (!match) return null;
  const tail = text.slice(
    match.index + match[0].length,
    match.index + match[0].length + 40,
  );
  return parseDate(tail);
}

export function extractLadvFields(
  rawText: string,
  confidence: number,
): LadvOcrResult {
  const text = (rawText ?? '').toUpperCase();
  if (!text.trim()) {
    return {
      ladvNumber: null,
      issuedAt: null,
      validUntil: null,
      confidence,
      status: 'FAIL',
    };
  }
  if (confidence < MIN_CONFIDENCE) {
    return {
      ladvNumber: null,
      issuedAt: null,
      validUntil: null,
      confidence,
      status: 'FAIL',
    };
  }
  const hasKeyword = KEYWORDS.some((k) => text.includes(k));
  if (!hasKeyword) {
    return {
      ladvNumber: null,
      issuedAt: null,
      validUntil: null,
      confidence,
      status: 'FAIL',
    };
  }

  // N[º°.oO0] covers OCR misreads of the ordinal indicator (Nº → No, N0, N.)
  const ladvMatch = text.match(
    /LADV[\s-]*(?:N[º°.oO0]?\s*)?(\d{4,12}|[A-Z]{1,4}-[A-Z]{0,3}-?\d{4,12})/,
  );
  const ladvNumber = ladvMatch ? ladvMatch[1].replace(/\s+/g, '') : null;

  const issuedAt =
    findFirstDateAfter(
      text,
      /EMITID[AO]\s+EM|EMISS[ÃA]O[:\s]|EXPEDI[ÇC][ÃA]O[:\s]|EXPEDIDA\s+EM/,
    ) ?? findFirstDateAfter(text, /DATA[\s]+(?:EMISS|EXPEDI)/);
  const validUntil =
    findFirstDateAfter(
      text,
      /V[ÁA]LID[AO]\s+AT[ÉE]|VALIDADE[:\s]|VENCIMENTO[:\s]|VENCE\s+EM/,
    ) ?? findFirstDateAfter(text, /DATA[\s]+VALIDADE/);

  const now = new Date();
  const datesOk = !!issuedAt && !!validUntil && validUntil > now;
  const status: LadvOcrStatus = ladvNumber && datesOk ? 'PASS' : 'NEEDS_REVIEW';

  return {
    ladvNumber,
    issuedAt,
    validUntil,
    confidence,
    status,
  };
}
