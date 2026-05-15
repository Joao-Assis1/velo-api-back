# Validation Module and Clinics Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar dois módulos transversais que servem de base para todos os fluxos de exame e agendamento da journey CONTRAN 1.020/2025: (1) `validation/` com validadores locais de CPF/CNH + integração ViaCEP + integração BrasilAPI/FIPE + mock SERPRO substituível por provider real; e (2) `clinics/` com catálogo paginado e filtros por UF/cidade/tipo, consumido pelos módulos `medical-exam/` e `psychological-exam/` no sub-plano seguinte.

**Architecture:** Dois módulos NestJS verticais e independentes em `src/modules/validation/` e `src/modules/clinics/`. `validation/` expõe a interface `DocumentValidationProvider` com duas implementações (Mock e Serpro placeholder), seleção controlada pela env `DOCUMENT_VALIDATION_PROVIDER` (default `mock`). ViaCEP e BrasilAPI são chamados via `fetch` nativo do Node 20+. `clinics/` é CRUD-leitura: rota pública autenticada para alunos, sem mutação de admin neste plano (admin entra em sub-plano posterior). Tabela `Clinic` já existe (criada no plano Foundation).

**Tech Stack:** NestJS 11 + Prisma 7 + PostgreSQL + Jest + Supertest. Dependências externas novas: `cpf-cnpj-validator` (CPF) e validador de CNH inline (algoritmo de dígitos público, sem dependência externa). HTTP externo via `fetch` nativo. Pasta `src/modules/validation/` e `src/modules/clinics/`. Endpoints `/api/v1/validation/*` e `/api/v1/clinics/*`.

**Spec de referência:** `docs/superpowers/specs/2026-05-14-brazilian-license-system-design.md` — seção 7 completa (validação de documentos) e parte da seção 6 (endpoints `/clinics` e `/validation`).

**Critério de pronto:**
- `POST /api/v1/validation/cpf` aceita CPF válido (true) e rejeita inválido (false) sem chamada externa.
- `POST /api/v1/validation/cnh` retorna `valid: true` em mock determinístico para um número de CNH whitelisted no MockProvider.
- `POST /api/v1/validation/cep` consulta ViaCEP e devolve `{ logradouro, bairro, cidade, uf }` para `01310-100`.
- `POST /api/v1/validation/vehicle-plate` consulta BrasilAPI e devolve `{ marca, modelo, ano }` para uma placa real ou retorna 404 controlado.
- `GET /api/v1/clinics?type=MEDICAL&uf=SP&city=Bauru` retorna 2 clínicas seedadas em Bauru/SP.
- `GET /api/v1/clinics?type=PSYCHOLOGICAL&uf=SP` retorna 3 clínicas seedadas com paginação `{ page, pageSize, total, items }`.
- `npm test` e `npm run test:e2e` verdes.

---

## File Structure

**Created (16 arquivos):**

- `src/modules/validation/validation.module.ts` — module wiring
- `src/modules/validation/validation.controller.ts` — endpoints `/validation/*`
- `src/modules/validation/validation.service.ts` — orquestra validators locais + provider externo + ViaCEP/FIPE
- `src/modules/validation/validation.service.spec.ts` — testes unitários
- `src/modules/validation/providers/document-validation.provider.ts` — interface `DocumentValidationProvider`
- `src/modules/validation/providers/mock-validation.provider.ts` — implementação mock determinística
- `src/modules/validation/providers/mock-validation.provider.spec.ts` — testes do mock
- `src/modules/validation/providers/serpro-validation.provider.ts` — placeholder ativável via env
- `src/modules/validation/lib/cpf.validator.ts` — wrapper sobre `cpf-cnpj-validator`
- `src/modules/validation/lib/cnh.validator.ts` — algoritmo local de dígitos da CNH
- `src/modules/validation/lib/cnh.validator.spec.ts` — testes do validador de CNH
- `src/modules/validation/dto/validate-cpf.dto.ts`
- `src/modules/validation/dto/validate-cnh.dto.ts`
- `src/modules/validation/dto/validate-cep.dto.ts`
- `src/modules/validation/dto/validate-plate.dto.ts`
- `src/modules/clinics/clinics.module.ts`
- `src/modules/clinics/clinics.controller.ts`
- `src/modules/clinics/clinics.service.ts`
- `src/modules/clinics/clinics.service.spec.ts`
- `src/modules/clinics/dto/list-clinics-query.dto.ts`
- `src/modules/clinics/dto/clinic.dto.ts`
- `test/validation.e2e-spec.ts`
- `test/clinics.e2e-spec.ts`

**Modified:**

- `src/app.module.ts` — importa `ValidationModule` e `ClinicsModule`
- `prisma/seed.ts` — 6 clínicas seedadas (3 médicas + 3 psicológicas) em SP/Bauru/Campinas
- `src/config/env.validation.ts` — adiciona `DOCUMENT_VALIDATION_PROVIDER`, `VIA_CEP_BASE_URL`, `BRASIL_API_BASE_URL`
- `package.json` — adiciona dependência `cpf-cnpj-validator`

---

## Task 1: Adicionar dependência `cpf-cnpj-validator` e env vars

**Files:**

- Modify: `package.json`
- Modify: `src/config/env.validation.ts`

- [ ] **Step 1.1: Instalar a dependência**

```bash
npm install cpf-cnpj-validator
```

Esperado: pacote adicionado em `dependencies`, sem warnings de peer.

- [ ] **Step 1.2: Adicionar as três novas envs ao validador**

Abrir `src/config/env.validation.ts` e localizar a classe `EnvironmentVariables` (ou equivalente). Adicionar:

```typescript
import { IsOptional, IsString, IsUrl, IsIn } from 'class-validator';

// dentro da classe EnvironmentVariables, junto com os demais campos:

@IsOptional()
@IsIn(['mock', 'serpro'])
DOCUMENT_VALIDATION_PROVIDER?: string = 'mock';

@IsOptional()
@IsUrl({ require_tld: false, require_protocol: true })
VIA_CEP_BASE_URL?: string = 'https://viacep.com.br/ws';

@IsOptional()
@IsUrl({ require_tld: false, require_protocol: true })
BRASIL_API_BASE_URL?: string = 'https://brasilapi.com.br/api';
```

Se o arquivo existente não usa class-validator e sim um esquema manual, adicionar as três chaves no objeto de defaults e na função de validação seguindo o padrão do arquivo.

- [ ] **Step 1.3: Documentar as novas envs no `.env.example` (se existir)**

```bash
ls .env.example 2>/dev/null && echo "exists"
```

Se existir, anexar:

```env
DOCUMENT_VALIDATION_PROVIDER=mock
VIA_CEP_BASE_URL=https://viacep.com.br/ws
BRASIL_API_BASE_URL=https://brasilapi.com.br/api
```

Se não existir, pular este passo (não criar arquivo só para isso).

- [ ] **Step 1.4: Commit**

```bash
git add package.json package-lock.json src/config/env.validation.ts .env.example
git commit -m "feat(env): valida envs do módulo validation (provider + ViaCEP + BrasilAPI)"
```

---

## Task 2: Validador local de CPF (wrapper)

**Files:**

- Create: `src/modules/validation/lib/cpf.validator.ts`

- [ ] **Step 2.1: Implementar o wrapper**

```typescript
// src/modules/validation/lib/cpf.validator.ts
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
```

Sem teste dedicado: a biblioteca `cpf-cnpj-validator` já cobre o algoritmo. O wrapper será exercitado nos testes do `ValidationService`.

- [ ] **Step 2.2: Commit**

```bash
git add src/modules/validation/lib/cpf.validator.ts
git commit -m "feat(validation): wrapper de validação de CPF com normalização"
```

---

## Task 3: Validador local de CNH com TDD

A CNH brasileira é um número de 11 dígitos com dois dígitos verificadores. Algoritmo público, sem dependência externa.

**Files:**

- Create: `src/modules/validation/lib/cnh.validator.ts`
- Create: `src/modules/validation/lib/cnh.validator.spec.ts`

- [ ] **Step 3.1: Escrever testes (TDD — testes primeiro)**

```typescript
// src/modules/validation/lib/cnh.validator.spec.ts
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
    // 02650306461 is a publicly used test CNH for the algorithm
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
```

- [ ] **Step 3.2: Rodar os testes — devem falhar**

```bash
npm test -- cnh.validator
```

Esperado: `FAIL — Cannot find module './cnh.validator'`.

- [ ] **Step 3.3: Implementar `cnh.validator.ts`**

```typescript
// src/modules/validation/lib/cnh.validator.ts
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

  // First check digit
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

  // Second check digit
  sum = 0;
  for (let i = 0, j = 1; i < 9; i++, j++) {
    sum += parseInt(digits[i], 10) * j;
  }
  let r = sum % 11;
  const d2 = r >= 10 ? 0 : r - dsc < 0 ? r - dsc + 11 : r - dsc;

  const expected = `${d1}${d2}`;
  const actual = digits.substring(9, 11);
  const valid = expected === actual;
  return { valid, normalized: valid ? digits : null };
}
```

- [ ] **Step 3.4: Rodar os testes — devem passar**

```bash
npm test -- cnh.validator
```

Esperado: `PASS — Tests: 6 passed`.

- [ ] **Step 3.5: Commit**

```bash
git add src/modules/validation/lib/cnh.validator.ts src/modules/validation/lib/cnh.validator.spec.ts
git commit -m "feat(validation): validador local de CNH com testes do algoritmo de dígitos"
```

---

## Task 4: Interface `DocumentValidationProvider` e mock determinístico com TDD

**Files:**

- Create: `src/modules/validation/providers/document-validation.provider.ts`
- Create: `src/modules/validation/providers/mock-validation.provider.ts`
- Create: `src/modules/validation/providers/mock-validation.provider.spec.ts`
- Create: `src/modules/validation/providers/serpro-validation.provider.ts`

- [ ] **Step 4.1: Definir a interface e o token de injeção**

```typescript
// src/modules/validation/providers/document-validation.provider.ts
export const DOCUMENT_VALIDATION_PROVIDER = Symbol(
  'DOCUMENT_VALIDATION_PROVIDER',
);

export interface CnhExternalCheck {
  valid: boolean;
  status: string; // VALID | EXPIRED | SUSPENDED | NOT_FOUND
  expiresAt?: Date;
}

export interface RenachExternalCheck {
  valid: boolean;
  processStatus?: string; // OPEN | DONE | NOT_FOUND
}

export interface FaceMatchResult {
  similarity: number;
  match: boolean;
}

export interface DocumentValidationProvider {
  validateCnh(cnhNumber: string, cpf: string): Promise<CnhExternalCheck>;
  validateRenach(
    renach: string,
    cpf: string,
  ): Promise<RenachExternalCheck>;
  matchFaceWithCnh(
    cpf: string,
    faceImageBase64: string,
  ): Promise<FaceMatchResult>;
}
```

- [ ] **Step 4.2: Escrever os testes do MockProvider (TDD)**

```typescript
// src/modules/validation/providers/mock-validation.provider.spec.ts
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
    it('returns OPEN for any well-formed RENACH starting with RNC-', async () => {
      const r = await provider.validateRenach('RNC-2026-00001', '12345678909');
      expect(r.valid).toBe(true);
      expect(r.processStatus).toBe('OPEN');
    });

    it('returns NOT_FOUND for malformed RENACH', async () => {
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
```

- [ ] **Step 4.3: Rodar os testes — devem falhar**

```bash
npm test -- mock-validation.provider
```

Esperado: `FAIL — Cannot find module './mock-validation.provider'`.

- [ ] **Step 4.4: Implementar `MockValidationProvider`**

```typescript
// src/modules/validation/providers/mock-validation.provider.ts
import { Injectable } from '@nestjs/common';
import {
  CnhExternalCheck,
  DocumentValidationProvider,
  FaceMatchResult,
  RenachExternalCheck,
} from './document-validation.provider';

@Injectable()
export class MockValidationProvider implements DocumentValidationProvider {
  private readonly knownCnh = new Map<string, CnhExternalCheck>([
    [
      '02650306461',
      {
        valid: true,
        status: 'VALID',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    ],
    ['99999999999', { valid: false, status: 'EXPIRED' }],
    ['88888888888', { valid: false, status: 'SUSPENDED' }],
  ]);

  async validateCnh(
    cnhNumber: string,
    _cpf: string,
  ): Promise<CnhExternalCheck> {
    await new Promise((r) => setTimeout(r, 50));
    const normalized = (cnhNumber ?? '').replace(/\D/g, '');
    return (
      this.knownCnh.get(normalized) ?? { valid: false, status: 'NOT_FOUND' }
    );
  }

  async validateRenach(
    renach: string,
    _cpf: string,
  ): Promise<RenachExternalCheck> {
    await new Promise((r) => setTimeout(r, 50));
    if (typeof renach === 'string' && /^RNC-\d{4}-\d{5}$/.test(renach)) {
      return { valid: true, processStatus: 'OPEN' };
    }
    return { valid: false, processStatus: 'NOT_FOUND' };
  }

  async matchFaceWithCnh(
    _cpf: string,
    _faceImageBase64: string,
  ): Promise<FaceMatchResult> {
    await new Promise((r) => setTimeout(r, 50));
    return { similarity: 0.92, match: true };
  }
}
```

- [ ] **Step 4.5: Implementar `SerproValidationProvider` (placeholder)**

```typescript
// src/modules/validation/providers/serpro-validation.provider.ts
import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  CnhExternalCheck,
  DocumentValidationProvider,
  FaceMatchResult,
  RenachExternalCheck,
} from './document-validation.provider';

@Injectable()
export class SerproValidationProvider implements DocumentValidationProvider {
  async validateCnh(): Promise<CnhExternalCheck> {
    throw new NotImplementedException(
      'SERPRO provider is not implemented in the MVP — set DOCUMENT_VALIDATION_PROVIDER=mock',
    );
  }
  async validateRenach(): Promise<RenachExternalCheck> {
    throw new NotImplementedException();
  }
  async matchFaceWithCnh(): Promise<FaceMatchResult> {
    throw new NotImplementedException();
  }
}
```

- [ ] **Step 4.6: Rodar os testes — devem passar**

```bash
npm test -- mock-validation.provider
```

Esperado: `PASS — Tests: 6 passed`.

- [ ] **Step 4.7: Commit**

```bash
git add src/modules/validation/providers/
git commit -m "feat(validation): interface DocumentValidationProvider + Mock + placeholder SERPRO"
```

---

## Task 5: DTOs do `ValidationController`

**Files:**

- Create: `src/modules/validation/dto/validate-cpf.dto.ts`
- Create: `src/modules/validation/dto/validate-cnh.dto.ts`
- Create: `src/modules/validation/dto/validate-cep.dto.ts`
- Create: `src/modules/validation/dto/validate-plate.dto.ts`

- [ ] **Step 5.1: DTO de CPF**

```typescript
// src/modules/validation/dto/validate-cpf.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ValidateCpfDto {
  @ApiProperty({ example: '123.456.789-09' })
  @IsString()
  @Length(11, 14)
  cpf!: string;
}
```

- [ ] **Step 5.2: DTO de CNH**

```typescript
// src/modules/validation/dto/validate-cnh.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ValidateCnhDto {
  @ApiProperty({ example: '02650306461' })
  @IsString()
  @Length(11, 14)
  cnhNumber!: string;

  @ApiProperty({ example: '12345678909' })
  @IsString()
  @Length(11, 14)
  cpf!: string;
}
```

- [ ] **Step 5.3: DTO de CEP**

```typescript
// src/modules/validation/dto/validate-cep.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ValidateCepDto {
  @ApiProperty({ example: '01310-100' })
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/)
  cep!: string;
}
```

- [ ] **Step 5.4: DTO de placa**

```typescript
// src/modules/validation/dto/validate-plate.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ValidatePlateDto {
  @ApiProperty({ example: 'ABC1D23' })
  @IsString()
  @Matches(/^[A-Z]{3}-?\d[A-Z\d]\d{2}$/i, {
    message: 'Plate must match Mercosul or Brazilian legacy format',
  })
  plate!: string;
}
```

- [ ] **Step 5.5: Commit**

```bash
git add src/modules/validation/dto/
git commit -m "feat(validation): DTOs com validação de formato (CPF, CNH, CEP, placa)"
```

---

## Task 6: `ValidationService` com TDD

O service orquestra: validador local (CPF/CNH) → provider externo opcional para CNH → fetch para ViaCEP/BrasilAPI.

**Files:**

- Create: `src/modules/validation/validation.service.ts`
- Create: `src/modules/validation/validation.service.spec.ts`

- [ ] **Step 6.1: Escrever os testes (TDD)**

```typescript
// src/modules/validation/validation.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { DOCUMENT_VALIDATION_PROVIDER } from './providers/document-validation.provider';
import { ConfigService } from '@nestjs/config';

describe('ValidationService', () => {
  let service: ValidationService;
  let provider: { validateCnh: jest.Mock; validateRenach: jest.Mock };
  let originalFetch: typeof fetch;

  beforeEach(async () => {
    originalFetch = global.fetch;
    provider = {
      validateCnh: jest.fn(),
      validateRenach: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        { provide: DOCUMENT_VALIDATION_PROVIDER, useValue: provider },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'VIA_CEP_BASE_URL') return 'https://viacep.com.br/ws';
              if (key === 'BRASIL_API_BASE_URL')
                return 'https://brasilapi.com.br/api';
              return undefined;
            },
          },
        },
      ],
    }).compile();
    service = module.get(ValidationService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('validateCpf', () => {
    it('returns valid=true and normalized for a valid CPF', () => {
      const r = service.validateCpf('111.444.777-35');
      expect(r.valid).toBe(true);
      expect(r.normalized).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
    });

    it('returns valid=false for malformed CPF', () => {
      const r = service.validateCpf('00000000000');
      expect(r.valid).toBe(false);
    });
  });

  describe('validateCnh', () => {
    it('rejects locally invalid CNH without calling external provider', async () => {
      const r = await service.validateCnh('11111111111', '11144477735');
      expect(r.valid).toBe(false);
      expect(r.status).toBe('LOCAL_INVALID');
      expect(provider.validateCnh).not.toHaveBeenCalled();
    });

    it('returns local-only result when provider is disabled', async () => {
      // simulate "mock provider but no external call required" by spying
      provider.validateCnh.mockResolvedValue({
        valid: true,
        status: 'VALID',
      });
      const r = await service.validateCnh('02650306461', '11144477735');
      expect(r.valid).toBe(true);
      expect(provider.validateCnh).toHaveBeenCalledWith(
        '02650306461',
        '11144477735',
      );
    });
  });

  describe('validateCep', () => {
    it('returns address fields for a valid CEP', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          cep: '01310-100',
          logradouro: 'Avenida Paulista',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
        }),
      }) as unknown as typeof fetch;

      const r = await service.validateCep('01310100');
      expect(r).toEqual({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        uf: 'SP',
      });
    });

    it('throws NotFoundException when ViaCEP returns erro=true', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ erro: true }),
      }) as unknown as typeof fetch;
      await expect(service.validateCep('99999999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException on network failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
      await expect(service.validateCep('01310100')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateVehiclePlate', () => {
    it('returns brand/model/year for an existing plate', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          marca: 'HYUNDAI',
          modelo: 'HB20',
          ano: 2023,
        }),
      }) as unknown as typeof fetch;
      const r = await service.validateVehiclePlate('ABC1D23');
      expect(r).toEqual({ marca: 'HYUNDAI', modelo: 'HB20', ano: 2023 });
    });

    it('throws NotFoundException for non-existing plate', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'not found' }),
      }) as unknown as typeof fetch;
      await expect(service.validateVehiclePlate('XYZ9Z99')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

- [ ] **Step 6.2: Rodar os testes — devem falhar**

```bash
npm test -- validation.service
```

- [ ] **Step 6.3: Implementar `validation.service.ts`**

```typescript
// src/modules/validation/validation.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateCpf } from './lib/cpf.validator';
import { validateCnh as validateCnhLocal } from './lib/cnh.validator';
import {
  DOCUMENT_VALIDATION_PROVIDER,
  DocumentValidationProvider,
} from './providers/document-validation.provider';

export interface CepAddress {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface PlateInfo {
  marca: string;
  modelo: string;
  ano: number;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    @Inject(DOCUMENT_VALIDATION_PROVIDER)
    private readonly provider: DocumentValidationProvider,
    private readonly config: ConfigService,
  ) {}

  validateCpf(cpf: string) {
    return validateCpf(cpf);
  }

  async validateCnh(cnhNumber: string, cpf: string) {
    const local = validateCnhLocal(cnhNumber);
    if (!local.valid) {
      return { valid: false, status: 'LOCAL_INVALID', expiresAt: null };
    }
    const external = await this.provider.validateCnh(
      local.normalized as string,
      cpf,
    );
    return {
      valid: external.valid,
      status: external.status,
      expiresAt: external.expiresAt ?? null,
    };
  }

  async validateCep(cep: string): Promise<CepAddress> {
    const digits = (cep ?? '').replace(/\D/g, '');
    if (digits.length !== 8) {
      throw new BadRequestException('CEP must have exactly 8 digits');
    }
    const base = this.config.get<string>('VIA_CEP_BASE_URL') ?? 'https://viacep.com.br/ws';
    try {
      const res = await fetch(`${base}/${digits}/json/`);
      if (!res.ok) {
        throw new BadRequestException(`ViaCEP returned ${res.status}`);
      }
      const body = (await res.json()) as Record<string, unknown>;
      if ((body as { erro?: boolean }).erro) {
        throw new NotFoundException(`CEP ${digits} not found`);
      }
      return {
        cep: String(body.cep ?? ''),
        logradouro: String(body.logradouro ?? ''),
        bairro: String(body.bairro ?? ''),
        cidade: String(body.localidade ?? ''),
        uf: String(body.uf ?? ''),
      };
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) {
        throw e;
      }
      this.logger.warn(`ViaCEP fetch failed: ${(e as Error).message}`);
      throw new BadRequestException(
        `ViaCEP request failed: ${(e as Error).message}`,
      );
    }
  }

  async validateVehiclePlate(plate: string): Promise<PlateInfo> {
    const normalized = (plate ?? '').replace(/\W/g, '').toUpperCase();
    if (!/^[A-Z]{3}\d[A-Z\d]\d{2}$/.test(normalized)) {
      throw new BadRequestException('Invalid plate format');
    }
    const base =
      this.config.get<string>('BRASIL_API_BASE_URL') ??
      'https://brasilapi.com.br/api';
    try {
      const res = await fetch(`${base}/fipe/marcas/v1/cars?placa=${normalized}`);
      if (res.status === 404) {
        throw new NotFoundException(`Plate ${normalized} not found`);
      }
      if (!res.ok) {
        throw new BadRequestException(
          `BrasilAPI returned status ${res.status}`,
        );
      }
      const body = (await res.json()) as Record<string, unknown>;
      return {
        marca: String(body.marca ?? ''),
        modelo: String(body.modelo ?? ''),
        ano: Number(body.ano ?? 0),
      };
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) {
        throw e;
      }
      this.logger.warn(`BrasilAPI fetch failed: ${(e as Error).message}`);
      throw new BadRequestException(
        `BrasilAPI request failed: ${(e as Error).message}`,
      );
    }
  }
}
```

- [ ] **Step 6.4: Rodar os testes — devem passar**

```bash
npm test -- validation.service
```

Esperado: `PASS — Tests: 9 passed`.

- [ ] **Step 6.5: Commit**

```bash
git add src/modules/validation/validation.service.ts src/modules/validation/validation.service.spec.ts
git commit -m "feat(validation): service orquestrando CPF/CNH locais + ViaCEP + BrasilAPI"
```

---

## Task 7: `ValidationController` e `ValidationModule`

**Files:**

- Create: `src/modules/validation/validation.controller.ts`
- Create: `src/modules/validation/validation.module.ts`

- [ ] **Step 7.1: Controller**

```typescript
// src/modules/validation/validation.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ValidationService } from './validation.service';
import { ValidateCpfDto } from './dto/validate-cpf.dto';
import { ValidateCnhDto } from './dto/validate-cnh.dto';
import { ValidateCepDto } from './dto/validate-cep.dto';
import { ValidatePlateDto } from './dto/validate-plate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('validation')
@ApiBearerAuth()
@Controller('validation')
@UseGuards(JwtAuthGuard)
export class ValidationController {
  constructor(private readonly validation: ValidationService) {}

  @Post('cpf')
  @ApiOkResponse({ description: 'Local CPF validation' })
  cpf(@Body() dto: ValidateCpfDto) {
    return this.validation.validateCpf(dto.cpf);
  }

  @Post('cnh')
  @ApiOkResponse({ description: 'Local + external CNH validation' })
  cnh(@Body() dto: ValidateCnhDto) {
    return this.validation.validateCnh(dto.cnhNumber, dto.cpf);
  }

  @Post('cep')
  @ApiOkResponse({ description: 'ViaCEP address lookup' })
  cep(@Body() dto: ValidateCepDto) {
    return this.validation.validateCep(dto.cep);
  }

  @Post('vehicle-plate')
  @ApiOkResponse({ description: 'BrasilAPI plate → vehicle info' })
  plate(@Body() dto: ValidatePlateDto) {
    return this.validation.validateVehiclePlate(dto.plate);
  }
}
```

**Importante:** se `JwtAuthGuard` não estiver em `src/modules/auth/guards/jwt-auth.guard.ts`, verificar `src/modules/auth/guards/index.ts` e usar o caminho correto. Não inventar guard novo.

- [ ] **Step 7.2: Module**

```typescript
// src/modules/validation/validation.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';
import { DOCUMENT_VALIDATION_PROVIDER } from './providers/document-validation.provider';
import { MockValidationProvider } from './providers/mock-validation.provider';
import { SerproValidationProvider } from './providers/serpro-validation.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [ValidationController],
  providers: [
    ValidationService,
    MockValidationProvider,
    SerproValidationProvider,
    {
      provide: DOCUMENT_VALIDATION_PROVIDER,
      inject: [ConfigService, MockValidationProvider, SerproValidationProvider],
      useFactory: (
        config: ConfigService,
        mock: MockValidationProvider,
        serpro: SerproValidationProvider,
      ) => {
        const chosen = config.get<string>('DOCUMENT_VALIDATION_PROVIDER') ?? 'mock';
        return chosen === 'serpro' ? serpro : mock;
      },
    },
  ],
  exports: [ValidationService, DOCUMENT_VALIDATION_PROVIDER],
})
export class ValidationModule {}
```

- [ ] **Step 7.3: Importar no `AppModule`**

Em `src/app.module.ts`, adicionar:

```typescript
import { ValidationModule } from './modules/validation/validation.module';

// dentro de imports[]:
    ValidationModule,
```

- [ ] **Step 7.4: Build sanity-check**

```bash
npm run build
```

Esperado: build limpo.

- [ ] **Step 7.5: Commit**

```bash
git add src/modules/validation/validation.controller.ts src/modules/validation/validation.module.ts src/app.module.ts
git commit -m "feat(validation): controller + module wiring com seleção de provider via env"
```

---

## Task 8: DTOs e `ClinicsService` com TDD

**Files:**

- Create: `src/modules/clinics/dto/list-clinics-query.dto.ts`
- Create: `src/modules/clinics/dto/clinic.dto.ts`
- Create: `src/modules/clinics/clinics.service.ts`
- Create: `src/modules/clinics/clinics.service.spec.ts`

- [ ] **Step 8.1: DTOs**

```typescript
// src/modules/clinics/dto/list-clinics-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListClinicsQueryDto {
  @ApiPropertyOptional({ enum: ['MEDICAL', 'PSYCHOLOGICAL'] })
  @IsOptional()
  @IsIn(['MEDICAL', 'PSYCHOLOGICAL'])
  type?: 'MEDICAL' | 'PSYCHOLOGICAL';

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  uf?: string;

  @ApiPropertyOptional({ example: 'Bauru' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
```

```typescript
// src/modules/clinics/dto/clinic.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ClinicDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['MEDICAL', 'PSYCHOLOGICAL'] })
  type!: 'MEDICAL' | 'PSYCHOLOGICAL';

  @ApiProperty()
  city!: string;

  @ApiProperty()
  uf!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty({ required: false })
  phone?: string | null;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  isActive!: boolean;
}

export class PaginatedClinicsDto {
  @ApiProperty({ type: [ClinicDto] })
  items!: ClinicDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;
}
```

- [ ] **Step 8.2: Escrever testes do service (TDD)**

```typescript
// src/modules/clinics/clinics.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClinicsService', () => {
  let service: ClinicsService;
  let prisma: { clinic: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      clinic: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ClinicsService);
  });

  describe('list', () => {
    it('filters by type, uf and city and applies pagination defaults', async () => {
      prisma.clinic.findMany.mockResolvedValue([
        { id: '1', name: 'Clínica A', type: 'MEDICAL', city: 'Bauru', uf: 'SP', address: '', phone: null, price: 200, isActive: true },
      ]);
      prisma.clinic.count.mockResolvedValue(1);

      const result = await service.list({
        type: 'MEDICAL',
        uf: 'SP',
        city: 'Bauru',
      });

      expect(prisma.clinic.findMany).toHaveBeenCalledWith({
        where: { type: 'MEDICAL', uf: 'SP', city: 'Bauru', isActive: true },
        skip: 0,
        take: 20,
        orderBy: { name: 'asc' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.total).toBe(1);
    });

    it('hides inactive clinics by default', async () => {
      prisma.clinic.findMany.mockResolvedValue([]);
      prisma.clinic.count.mockResolvedValue(0);
      await service.list({});
      expect(prisma.clinic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('applies page=2 pageSize=10 → skip=10 take=10', async () => {
      prisma.clinic.findMany.mockResolvedValue([]);
      prisma.clinic.count.mockResolvedValue(0);
      await service.list({ page: 2, pageSize: 10 });
      expect(prisma.clinic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('findById', () => {
    it('returns the clinic when found', async () => {
      prisma.clinic.findUnique.mockResolvedValue({
        id: 'c1',
        name: 'Clínica X',
        type: 'PSYCHOLOGICAL',
        city: 'São Paulo',
        uf: 'SP',
        address: 'Rua A',
        phone: null,
        price: 180,
        isActive: true,
      });
      const r = await service.findById('c1');
      expect(r.id).toBe('c1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.clinic.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

- [ ] **Step 8.3: Rodar os testes — devem falhar**

```bash
npm test -- clinics.service
```

- [ ] **Step 8.4: Implementar `clinics.service.ts`**

```typescript
// src/modules/clinics/clinics.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListClinicsQueryDto } from './dto/list-clinics-query.dto';
import { ClinicDto, PaginatedClinicsDto } from './dto/clinic.dto';

@Injectable()
export class ClinicsService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListClinicsQueryDto): Promise<PaginatedClinicsDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = { isActive: true };
    if (query.type) where.type = query.type;
    if (query.uf) where.uf = query.uf;
    if (query.city) where.city = query.city;

    const [items, total] = await Promise.all([
      this.prisma.clinic.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.clinic.count({ where }),
    ]);

    return {
      items: items as ClinicDto[],
      page,
      pageSize,
      total,
    };
  }

  async findById(id: string): Promise<ClinicDto> {
    const clinic = await this.prisma.clinic.findUnique({ where: { id } });
    if (!clinic) throw new NotFoundException(`Clinic ${id} not found`);
    return clinic as ClinicDto;
  }
}
```

- [ ] **Step 8.5: Rodar os testes — devem passar**

```bash
npm test -- clinics.service
```

Esperado: `PASS — Tests: 5 passed`.

- [ ] **Step 8.6: Commit**

```bash
git add src/modules/clinics/clinics.service.ts src/modules/clinics/clinics.service.spec.ts src/modules/clinics/dto/
git commit -m "feat(clinics): service paginado com filtros uf/city/type e testes"
```

---

## Task 9: `ClinicsController` e `ClinicsModule`

**Files:**

- Create: `src/modules/clinics/clinics.controller.ts`
- Create: `src/modules/clinics/clinics.module.ts`

- [ ] **Step 9.1: Controller**

```typescript
// src/modules/clinics/clinics.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { ListClinicsQueryDto } from './dto/list-clinics-query.dto';
import { ClinicDto, PaginatedClinicsDto } from './dto/clinic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('clinics')
@ApiBearerAuth()
@Controller('clinics')
@UseGuards(JwtAuthGuard)
export class ClinicsController {
  constructor(private readonly clinics: ClinicsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedClinicsDto })
  list(@Query() query: ListClinicsQueryDto): Promise<PaginatedClinicsDto> {
    return this.clinics.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ClinicDto })
  findOne(@Param('id') id: string): Promise<ClinicDto> {
    return this.clinics.findById(id);
  }
}
```

- [ ] **Step 9.2: Module**

```typescript
// src/modules/clinics/clinics.module.ts
import { Module } from '@nestjs/common';
import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
```

- [ ] **Step 9.3: Importar no `AppModule`**

```typescript
import { ClinicsModule } from './modules/clinics/clinics.module';

// imports[]:
    ClinicsModule,
```

- [ ] **Step 9.4: Build sanity-check**

```bash
npm run build
```

- [ ] **Step 9.5: Commit**

```bash
git add src/modules/clinics/clinics.controller.ts src/modules/clinics/clinics.module.ts src/app.module.ts
git commit -m "feat(clinics): controller + module wiring em /api/v1/clinics"
```

---

## Task 10: Seed de 6 clínicas

**Files:**

- Modify: `prisma/seed.ts`

- [ ] **Step 10.1: Adicionar bloco de seed de clínicas no `prisma/seed.ts`**

Antes do fechamento de `main()` (e idealmente próximo do bloco de journey-staged students do plano Foundation), inserir:

```typescript
// ============================================================================
// Clinics seed — 6 clínicas (3 MEDICAL + 3 PSYCHOLOGICAL) em SP/Bauru/Campinas
// ============================================================================

const clinicsData: Array<{
  name: string;
  type: 'MEDICAL' | 'PSYCHOLOGICAL';
  city: string;
  uf: string;
  address: string;
  phone: string | null;
  price: number;
}> = [
  {
    name: 'Clínica Avenida Paulista',
    type: 'MEDICAL',
    city: 'São Paulo',
    uf: 'SP',
    address: 'Av. Paulista, 1000',
    phone: '(11) 3000-1000',
    price: 250,
  },
  {
    name: 'Clínica Bauru Centro',
    type: 'MEDICAL',
    city: 'Bauru',
    uf: 'SP',
    address: 'Rua Batista de Carvalho, 200',
    phone: '(14) 3200-2000',
    price: 200,
  },
  {
    name: 'Clínica Campinas Saúde',
    type: 'MEDICAL',
    city: 'Campinas',
    uf: 'SP',
    address: 'Av. Norte-Sul, 500',
    phone: '(19) 3100-3000',
    price: 220,
  },
  {
    name: 'Psico Paulista',
    type: 'PSYCHOLOGICAL',
    city: 'São Paulo',
    uf: 'SP',
    address: 'Rua Augusta, 1500',
    phone: '(11) 3000-1500',
    price: 180,
  },
  {
    name: 'Psico Bauru Avaliações',
    type: 'PSYCHOLOGICAL',
    city: 'Bauru',
    uf: 'SP',
    address: 'Rua Araújo Leite, 300',
    phone: '(14) 3200-1800',
    price: 160,
  },
  {
    name: 'Psico Campinas Mental',
    type: 'PSYCHOLOGICAL',
    city: 'Campinas',
    uf: 'SP',
    address: 'Rua Barão de Jaguara, 800',
    phone: '(19) 3100-1900',
    price: 170,
  },
];

for (const c of clinicsData) {
  // Como Clinic não tem campo @unique acessível como where (apenas id),
  // usamos findFirst + create/update manuais idempotentes.
  const existing = await prisma.clinic.findFirst({
    where: { name: c.name, city: c.city, uf: c.uf },
  });
  if (existing) {
    await prisma.clinic.update({
      where: { id: existing.id },
      data: { ...c, isActive: true },
    });
  } else {
    await prisma.clinic.create({ data: { ...c, isActive: true } });
  }
}
```

- [ ] **Step 10.2: Rodar o seed**

```bash
npx prisma db seed
```

Esperado: `Seed completed`, 6 clínicas existindo na tabela. Rodar uma segunda vez deve ser idempotente.

- [ ] **Step 10.3: Verificar no banco**

```bash
npx prisma studio
```

Conferir tabela `Clinic`: 6 linhas, todas ativas, 3 MEDICAL + 3 PSYCHOLOGICAL.

- [ ] **Step 10.4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): adiciona 6 clínicas (médicas e psicológicas) em SP/Bauru/Campinas"
```

---

## Task 11: E2E de `/validation/*`

**Files:**

- Create: `test/validation.e2e-spec.ts`

- [ ] **Step 11.1: Escrever o e2e**

```typescript
// test/validation.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const login = async (
  app: INestApplication,
  email: string,
): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: '123456' });
  return res.body.data?.token ?? res.body.token;
};

describe('Validation (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let originalFetch: typeof fetch;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    token = await login(app, 'gabriel@email.com'); // seed default
    originalFetch = global.fetch;
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await app.close();
  });

  it('POST /validation/cpf returns valid=true for a known good CPF', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/validation/cpf')
      .set('Authorization', `Bearer ${token}`)
      .send({ cpf: '111.444.777-35' })
      .expect(201);
    expect(res.body.data.valid).toBe(true);
  });

  it('POST /validation/cpf returns valid=false for an invalid CPF', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/validation/cpf')
      .set('Authorization', `Bearer ${token}`)
      .send({ cpf: '00000000000' })
      .expect(201);
    expect(res.body.data.valid).toBe(false);
  });

  it('POST /validation/cnh returns VALID for the whitelisted mock number', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/validation/cnh')
      .set('Authorization', `Bearer ${token}`)
      .send({ cnhNumber: '02650306461', cpf: '11144477735' })
      .expect(201);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.status).toBe('VALID');
  });

  it('POST /validation/cep returns address fields for 01310-100 (ViaCEP stubbed)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    }) as unknown as typeof fetch;

    const res = await request(app.getHttpServer())
      .post('/api/v1/validation/cep')
      .set('Authorization', `Bearer ${token}`)
      .send({ cep: '01310-100' })
      .expect(201);
    expect(res.body.data.uf).toBe('SP');
    expect(res.body.data.cidade).toBe('São Paulo');
  });

  it('POST /validation/vehicle-plate returns brand/model/year (BrasilAPI stubbed)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        marca: 'HYUNDAI',
        modelo: 'HB20',
        ano: 2023,
      }),
    }) as unknown as typeof fetch;

    const res = await request(app.getHttpServer())
      .post('/api/v1/validation/vehicle-plate')
      .set('Authorization', `Bearer ${token}`)
      .send({ plate: 'ABC1D23' })
      .expect(201);
    expect(res.body.data.marca).toBe('HYUNDAI');
    expect(res.body.data.modelo).toBe('HB20');
  });
});
```

- [ ] **Step 11.2: Rodar o e2e**

```bash
npm run test:e2e -- validation
```

Esperado: `PASS — Tests: 5 passed`.

- [ ] **Step 11.3: Commit**

```bash
git add test/validation.e2e-spec.ts
git commit -m "test(validation): e2e cobrindo CPF/CNH/CEP/placa com fetch mockado"
```

---

## Task 12: E2E de `/clinics`

**Files:**

- Create: `test/clinics.e2e-spec.ts`

- [ ] **Step 12.1: Escrever o e2e**

```typescript
// test/clinics.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const login = async (
  app: INestApplication,
  email: string,
): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: '123456' });
  return res.body.data?.token ?? res.body.token;
};

describe('Clinics (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    token = await login(app, 'gabriel@email.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /clinics?type=MEDICAL&uf=SP returns 3 medical clinics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/clinics?type=MEDICAL&uf=SP')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.items).toHaveLength(3);
    expect(
      res.body.data.items.every((c: { type: string }) => c.type === 'MEDICAL'),
    ).toBe(true);
  });

  it('GET /clinics?type=PSYCHOLOGICAL&city=Bauru returns 1 clinic', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/clinics?type=PSYCHOLOGICAL&city=Bauru')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].city).toBe('Bauru');
  });

  it('GET /clinics with no filters returns paginated list with pageSize default 20', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/clinics')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.pageSize).toBe(20);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(6);
  });

  it('GET /clinics/:id returns a single clinic', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/clinics?type=MEDICAL')
      .set('Authorization', `Bearer ${token}`);
    const someId = list.body.data.items[0].id as string;

    const res = await request(app.getHttpServer())
      .get(`/api/v1/clinics/${someId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.id).toBe(someId);
  });

  it('GET /clinics/missing returns 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/clinics/non-existing-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
```

- [ ] **Step 12.2: Rodar o e2e**

```bash
npm run test:e2e -- clinics
```

Esperado: `PASS — Tests: 5 passed`.

- [ ] **Step 12.3: Commit**

```bash
git add test/clinics.e2e-spec.ts
git commit -m "test(clinics): e2e cobrindo filtros uf/city/type, paginação e findById"
```

---

## Task 13: Atualizar `CLAUDE.md` com os módulos novos

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 13.1: Adicionar `validation/` e `clinics/` na árvore de pastas**

Localizar o bloco `## Estrutura de Pastas` no `CLAUDE.md`. Adicionar (alfabeticamente):

```
├── clinics/           # catálogo de clínicas médicas e psicológicas (CONTRAN 1.020/2025)
├── compliance/        # ...
```

e

```
├── students/          # ...
├── telemetria/        # ...
├── validation/        # CPF/CNH locais + ViaCEP + BrasilAPI + provider externo plugável
├── vehicles/          # ...
```

- [ ] **Step 13.2: Adicionar variáveis na tabela de envs**

Adicionar ao final da tabela de envs no `CLAUDE.md`:

```
| `DOCUMENT_VALIDATION_PROVIDER` | Opcional; `mock` (padrão) ou `serpro` |
| `VIA_CEP_BASE_URL` | Opcional; padrão `https://viacep.com.br/ws` |
| `BRASIL_API_BASE_URL` | Opcional; padrão `https://brasilapi.com.br/api` |
```

- [ ] **Step 13.3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: atualiza estrutura de pastas e envs (validation + clinics)"
```

---

## Self-Review Checklist (executado antes da entrega)

**Spec coverage** — cada requisito das seções 6 (parcial) e 7 do spec:

- ✅ Endpoints `/validation/cpf`, `/validation/cnh`, `/validation/cep`, `/validation/vehicle-plate` (Seção 6) — Task 7
- ✅ Endpoint `GET /clinics` paginado com filtros (Seção 6) — Task 9
- ✅ Endpoint `GET /clinics/:id` (Seção 6) — Task 9
- ✅ Validador local de CPF via `cpf-cnpj-validator` (Seção 7) — Task 2
- ✅ Validador local de CNH com algoritmo de dígitos (Seção 7) — Task 3
- ✅ Integração ViaCEP (Seção 7) — Task 6
- ✅ Integração BrasilAPI/FIPE (Seção 7) — Task 6
- ✅ Interface `DocumentValidationProvider` com Mock + Serpro placeholder (Seção 7) — Task 4
- ✅ Seleção via `DOCUMENT_VALIDATION_PROVIDER` env (Seção 9 — env vars) — Tasks 1 e 7
- ⏭ Validação de face (face match) — interface pronta no Mock, mas sem endpoint no MVP (será exposto em sub-plano futuro se necessário)
- ⏭ Cadeia de validação em `LessonsService.create()` (Seção 7) — sub-plano LADV-and-Lesson-Gate

**Placeholder scan** — sem TBD/TODO/"implement later"/"similar to". Código completo em cada step.

**Type consistency** — `DocumentValidationProvider`, `CnhExternalCheck`, `RenachExternalCheck`, `FaceMatchResult` declarados em Task 4 e usados em Tasks 4 (Mock e Serpro), 6 (Service). `ListClinicsQueryDto`, `ClinicDto`, `PaginatedClinicsDto` declarados em Task 8 e consumidos em Tasks 8 (service), 9 (controller), 12 (e2e). `CepAddress` e `PlateInfo` definidos no service em Task 6.

**Estado terminal deste sub-plano:**

- Módulo `validation/` funcional com mock + provider plugável + validação local + APIs externas (ViaCEP + BrasilAPI).
- Módulo `clinics/` funcional com listagem paginada e busca por ID.
- 6 clínicas seedadas em SP/Bauru/Campinas (3 médicas + 3 psicológicas).
- 100% dos testes unitários verdes (CNH, MockProvider, ValidationService, ClinicsService).
- E2E verdes para `/validation/*` e `/clinics/*`.
- CLAUDE.md atualizado com os módulos novos e envs.

**Próximo sub-plano:** `2026-05-14-pre-practical-stages.md` consome `clinics/` para `medical-exam/` e `psychological-exam/` e consome `validation/` para verificar RENACH no `renach-process/`.
