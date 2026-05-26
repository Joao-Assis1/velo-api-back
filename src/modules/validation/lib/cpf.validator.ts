import { cpf as cpfLib } from 'cpf-cnpj-validator';

export interface CpfValidationResult {
  valid: boolean;
  normalized: string | null;
}

export function validateCpf(input: string): CpfValidationResult {
  if (!input) return { valid: false, normalized: null };
  const onlyDigits = input.replace(/\D/g, '');
  if (onlyDigits.length !== 11) return { valid: false, normalized: null };
  const valid = cpfLib.isValid(onlyDigits);
  return {
    valid,
    normalized: valid ? cpfLib.format(onlyDigits) : null,
  };
}
