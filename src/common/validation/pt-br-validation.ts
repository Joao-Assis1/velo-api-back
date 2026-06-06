import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Tradução pt-BR das mensagens padrão do class-validator.
 *
 * Em vez de adicionar `{ message }` em cada decorator dos DTOs, este
 * exceptionFactory centraliza a tradução de todas as constraints. Mensagens
 * customizadas que já estão em português (com acentos) são preservadas.
 */

const PROPERTY_LABELS: Record<string, string> = {
  email: 'e-mail',
  password: 'senha',
  newPassword: 'nova senha',
  name: 'nome',
  phone: 'telefone',
  cpf: 'CPF',
  cnhNumber: 'número da CNH',
  cnhCategory: 'categoria da CNH',
  cnhExpiry: 'validade da CNH',
  token: 'token',
  refresh_token: 'refresh token',
  cep: 'CEP',
  plate: 'placa',
  pricePerClass: 'valor por aula',
  date: 'data',
  startTime: 'horário inicial',
  endTime: 'horário final',
  instructorId: 'instrutor',
  studentId: 'aluno',
  vehicleId: 'veículo',
  paymentMethodId: 'método de pagamento',
  lessonId: 'aula',
  rating: 'avaliação',
  uf: 'UF',
  ufDetran: 'UF do Detran',
  ufDomicile: 'UF de domicílio',
  renachNumber: 'número do RENACH',
  ladvNumber: 'número da LADV',
  ladvValidUntil: 'validade da LADV',
  cardNumber: 'número do cartão',
  cardholderName: 'nome no cartão',
  expiryMonth: 'mês de validade',
  expiryYear: 'ano de validade',
  cvv: 'CVV',
  bio: 'biografia',
  location: 'localização',
  birthDate: 'data de nascimento',
  motherName: 'nome da mãe',
  reason: 'motivo',
  action: 'ação',
  step: 'etapa',
  status: 'status',
  lat: 'latitude',
  lng: 'longitude',
  transmission: 'câmbio',
  model: 'modelo',
  year: 'ano',
};

const label = (prop: string): string => PROPERTY_LABELS[prop] ?? prop;
const nums = (s: string): number[] => (s.match(/\d+/g) ?? []).map(Number);

function translate(key: string, property: string, original: string): string {
  const l = label(property);
  const n = nums(original);
  switch (key) {
    case 'isNotEmpty':
    case 'isDefined':
      return `O campo "${l}" é obrigatório`;
    case 'isEmail':
      return 'Informe um e-mail válido';
    case 'isString':
      return `O campo "${l}" deve ser um texto`;
    case 'isInt':
      return `O campo "${l}" deve ser um número inteiro`;
    case 'isNumber':
    case 'isNumberString':
      return `O campo "${l}" deve ser um número`;
    case 'isPositive':
      return `O campo "${l}" deve ser maior que zero`;
    case 'isBoolean':
      return `O campo "${l}" deve ser verdadeiro ou falso`;
    case 'isArray':
      return `O campo "${l}" deve ser uma lista`;
    case 'isDateString':
    case 'isDate':
      return `O campo "${l}" deve ser uma data válida`;
    case 'isEnum':
      return `O campo "${l}" possui um valor inválido`;
    case 'isUuid':
    case 'isUUID':
      return `O campo "${l}" deve ser um identificador válido`;
    case 'minLength':
      return `O campo "${l}" deve ter no mínimo ${n[0] ?? ''} caractere(s)`;
    case 'maxLength':
      return `O campo "${l}" deve ter no máximo ${n[0] ?? ''} caractere(s)`;
    case 'isLength':
    case 'length':
      if (n.length >= 2)
        return `O campo "${l}" deve ter entre ${n[0]} e ${n[1]} caracteres`;
      if (n.length === 1)
        return `O campo "${l}" deve ter ${n[0]} caracteres`;
      return `O campo "${l}" tem tamanho inválido`;
    case 'min':
      return `O campo "${l}" deve ser no mínimo ${n[0] ?? ''}`;
    case 'max':
      return `O campo "${l}" deve ser no máximo ${n[0] ?? ''}`;
    case 'arrayMinSize':
      return `O campo "${l}" deve conter no mínimo ${n[0] ?? ''} item(ns)`;
    case 'arrayMaxSize':
      return `O campo "${l}" deve conter no máximo ${n[0] ?? ''} item(ns)`;
    case 'arrayNotEmpty':
      return `O campo "${l}" não pode estar vazio`;
    case 'matches':
      return `O campo "${l}" está em um formato inválido`;
    case 'whitelistValidation':
      return `O campo "${l}" não é permitido`;
    default:
      return `O campo "${l}" é inválido`;
  }
}

function collect(errors: ValidationError[], acc: string[] = []): string[] {
  for (const err of errors) {
    if (err.constraints) {
      for (const [key, msg] of Object.entries(err.constraints)) {
        // Preserva mensagens customizadas já em português (com acentos)
        if (/[À-ÿ]/.test(msg)) acc.push(msg);
        else acc.push(translate(key, err.property, msg));
      }
    }
    if (err.children?.length) collect(err.children, acc);
  }
  return acc;
}

export function ptBrValidationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException(collect(errors));
}
