# LADV Process and Lesson Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a etapa 7 da Resolução CONTRAN 1.020/2025 (LADV) em um módulo vertical próprio e blindar a criação de aulas práticas com a cadeia completa de validações descrita na seção 7 da spec. Isso conclui o caminho funcional desde `AWAITING_LADV_UPLOAD` até `READY_FOR_PRACTICAL_EXAM`. Inclui também a extensão do worker diário, o endpoint `practical-summary` da fase prática e o seed do aluno final em `READY_FOR_PRACTICAL_EXAM`.

**Architecture:** Novo módulo `ladv-process/` orientado a upload (migra o OCR Tesseract que vivia em `StudentsService.uploadLadv` para um service dedicado que popula os 5 campos da Foundation: `ladvNumber`, `ladvIssuedAt`, `ladvValidUntil`, `ladvOcrConfidence`, `ladvOcrStatus`). `LessonsService.create()` ganha uma cadeia de 6 verificações sequenciais — `JourneyService.assertCanScheduleLesson` substitui o check legado `ladvUploaded`. O worker `CredentialsWorker` é ampliado para refletir os campos novos do `Instructor` (`credentialStatus`, `credentialValidUntil`, `stripeAccountStatus`). `ComplianceService` ganha `getPracticalSummary()` que aplica `isValidForCompliance(lesson)` (critério canônico da seção 8). Endpoints legados `POST /students/:id/ladv-upload` e `GET /students/:id/ladv-status` são removidos completamente — não há frontend consumindo ainda, então não há janela de compatibilidade a preservar. Campos antigos do schema (`ladvUploaded`, `ladv_document_url`, `ladv_validation_date`) ficam, pois `ComplianceService.getComplianceReport()` ainda os lê; `LadvProcessService` os atualiza em paralelo aos campos novos.

**Tech Stack:** NestJS 11 + Prisma 7 + Tesseract.js 5 (já no projeto) + Jest + Supertest. Sem dependências novas. Pasta `src/modules/ladv-process/`. Endpoints `/api/v1/ladv/*` e `/api/v1/compliance/students/:studentId/practical-summary`.

**Spec de referência:** `docs/superpowers/specs/2026-05-14-brazilian-license-system-design.md` — Seção 6 (endpoints `/ladv` e mudanças em `/lessons`), Seção 7 (cadeia de validações em `LessonsService.create()`), Seção 8 (compliance da fase prática + extensões do worker), Seção 11 (seed `student-ready@email.com`).

**Critério de pronto:**
- `POST /api/v1/ladv/me/upload` com PDF/JPEG/PNG válido aceita OCR com confiança ≥ 50% e popula `ladvNumber`, `ladvIssuedAt`, `ladvValidUntil`, `ladvOcrConfidence=<num>`, `ladvOcrStatus=PASS`; OCR ambíguo grava `ladvOcrStatus=NEEDS_REVIEW`; falha grava `FAIL`.
- `POST /api/v1/ladv/me/manual` com `{ ladvNumber, ladvIssuedAt, ladvValidUntil }` salva sem OCR e marca `ladvOcrStatus=NEEDS_REVIEW`.
- `GET /api/v1/journey/me` para o aluno `student-awaiting-ladv@email.com` retorna `LADV_UPLOADED_VALID` após upload bem-sucedido.
- `POST /api/v1/lessons` rejeita com 400 quando o stage está abaixo de `LADV_UPLOADED_VALID`.
- `POST /api/v1/lessons` rejeita com 400 quando o instrutor tem `credentialStatus != APPROVED` ou `credentialValidUntil < now`.
- `POST /api/v1/lessons` rejeita com 400 quando a CNH do instrutor é inválida no validador local ou `cnhExpiry < now`.
- Worker diário marca `credentialStatus=EXPIRED` e `stripeAccountStatus=RESTRICTED` para instrutores com `credentialValidUntil < now`.
- `GET /api/v1/compliance/students/:studentId/practical-summary` retorna `{ totalCompletedLessons, totalValidatedMinutes, meetsMinimumLegal, lessonsWithIntegrityIssues, canDeclareReadyForExam }`.
- Seed `student-ready@email.com` retorna `stage=READY_FOR_PRACTICAL_EXAM` em `/journey/me`.
- `npm test` e `npm run test:e2e` verdes.

---

## File Structure

**Created (10 arquivos):**

- `src/modules/ladv-process/ladv-process.module.ts`
- `src/modules/ladv-process/ladv-process.controller.ts`
- `src/modules/ladv-process/ladv-process.service.ts`
- `src/modules/ladv-process/ladv-process.service.spec.ts`
- `src/modules/ladv-process/lib/ladv-ocr.ts` — função pura de extração de campos a partir do texto do OCR
- `src/modules/ladv-process/lib/ladv-ocr.spec.ts`
- `src/modules/ladv-process/dto/ladv-status.dto.ts`
- `src/modules/ladv-process/dto/manual-ladv.dto.ts`
- `src/modules/compliance/dto/practical-summary.dto.ts`
- `test/ladv-process.e2e-spec.ts`
- `test/lessons-gate.e2e-spec.ts`
- `test/compliance-practical-summary.e2e-spec.ts`

**Modified:**

- `src/modules/lessons/lessons.service.ts` — substitui check legado `ladvUploaded` pela cadeia de 6 validações
- `src/modules/lessons/lessons.service.spec.ts` — cobre cada link da cadeia
- `src/modules/lessons/lessons.module.ts` — importa `JourneyModule` e `ValidationModule`
- `src/modules/compliance/compliance.service.ts` — adiciona `getPracticalSummary()`
- `src/modules/compliance/compliance.service.spec.ts` — cobre `getPracticalSummary()`
- `src/modules/compliance/compliance.controller.ts` — adiciona endpoint `practical-summary`
- `src/modules/compliance/credentials.worker.ts` — adiciona checks de `credentialValidUntil` e `ladvValidUntil` (novos campos)
- `src/modules/compliance/credentials.worker.spec.ts` — cobre casos novos
- `src/modules/students/students.controller.ts` — remove `POST /students/:id/ladv-upload` e `GET /students/:id/ladv-status` (substituídos pelo módulo `ladv-process/`)
- `src/modules/students/students.service.ts` — remove `uploadLadv()` e `getLadvStatus()` + import não usado de `tesseract.js`
- `src/app.module.ts` — importa `LadvProcessModule`
- `prisma/seed.ts` — `student-ready@email.com` com 2 Lesson válidas + atualiza `student-awaiting-ladv` para garantir OfficialTheoryExam APROVADO consistente com o estado
- `test/journey.e2e-spec.ts` — adiciona caso `student-ready@email.com → READY_FOR_PRACTICAL_EXAM`
- `CLAUDE.md` — adiciona `ladv-process/` à estrutura de pastas + nota sobre cadeia de validação

---

## Task 1: Função pura de extração de OCR (TDD)

A função recebe o texto bruto retornado pelo Tesseract e retorna `{ ladvNumber, issuedAt, validUntil, confidence, status }`. Isolar a regex-extraction em uma função pura permite testar massivamente sem precisar de Tesseract real.

**Files:**

- Create: `src/modules/ladv-process/lib/ladv-ocr.ts`
- Create: `src/modules/ladv-process/lib/ladv-ocr.spec.ts`

- [ ] **Step 1.1: Escrever os testes (TDD)**

```typescript
// src/modules/ladv-process/lib/ladv-ocr.spec.ts
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
});
```

- [ ] **Step 1.2: Rodar os testes — devem falhar**

```bash
npm test -- ladv-ocr
```

Esperado: `FAIL — Cannot find module './ladv-ocr'`.

- [ ] **Step 1.3: Implementar `ladv-ocr.ts`**

```typescript
// src/modules/ladv-process/lib/ladv-ocr.ts
export type LadvOcrStatus = 'PASS' | 'NEEDS_REVIEW' | 'FAIL';

export interface LadvOcrResult {
  ladvNumber: string | null;
  issuedAt: Date | null;
  validUntil: Date | null;
  confidence: number;
  status: LadvOcrStatus;
}

const KEYWORDS = [
  'LADV',
  'LICENÇA',
  'LICENCA',
  'APRENDIZAGEM',
  'DETRAN',
];

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
  const tail = text.slice(match.index + match[0].length, match.index + match[0].length + 40);
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

  const ladvMatch = text.match(/LADV[\s-]*(?:N[º°.]?\s*)?([A-Z]{0,3}-?[A-Z]{0,3}-?\d{4,12})/);
  const ladvNumber = ladvMatch ? ladvMatch[1].replace(/\s+/g, '') : null;

  const issuedAt =
    findFirstDateAfter(text, /EMITID[AO]\s+EM|EMISS[ÃA]O[:\s]/) ??
    findFirstDateAfter(text, /DATA[\s]+EMISS/);
  const validUntil =
    findFirstDateAfter(text, /V[ÁA]LID[AO]\s+AT[ÉE]|VALIDADE[:\s]/) ??
    findFirstDateAfter(text, /DATA[\s]+VALIDADE/);

  const now = new Date();
  const datesOk = !!issuedAt && !!validUntil && validUntil > now;
  const status: LadvOcrStatus =
    ladvNumber && datesOk ? 'PASS' : 'NEEDS_REVIEW';

  return {
    ladvNumber,
    issuedAt,
    validUntil,
    confidence,
    status,
  };
}
```

- [ ] **Step 1.4: Rodar os testes — devem passar**

```bash
npm test -- ladv-ocr
```

Esperado: `PASS — Tests: 7 passed`.

- [ ] **Step 1.5: Commit**

```bash
git add src/modules/ladv-process/lib/
git commit -m "feat(ladv-process): função pura de extração de campos do OCR + testes"
```

---

## Task 2: DTOs do módulo `ladv-process`

**Files:**

- Create: `src/modules/ladv-process/dto/ladv-status.dto.ts`
- Create: `src/modules/ladv-process/dto/manual-ladv.dto.ts`

- [ ] **Step 2.1: DTO de status**

```typescript
// src/modules/ladv-process/dto/ladv-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class LadvStatusDto {
  @ApiProperty({ required: false, nullable: true })
  ladvNumber!: string | null;

  @ApiProperty({ required: false, nullable: true })
  ladvIssuedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  ladvValidUntil!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  ladvOcrConfidence!: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    enum: ['PASS', 'NEEDS_REVIEW', 'FAIL'],
  })
  ladvOcrStatus!: 'PASS' | 'NEEDS_REVIEW' | 'FAIL' | null;

  @ApiProperty({ required: false, nullable: true })
  ladvDocumentUrl!: string | null;

  @ApiProperty({ description: 'Stage from JourneyService after this state' })
  stage!: string;

  @ApiProperty({
    description: 'True when ladvOcrStatus=PASS AND ladvValidUntil > now',
  })
  canBook!: boolean;
}
```

- [ ] **Step 2.2: DTO de entrada manual**

```typescript
// src/modules/ladv-process/dto/manual-ladv.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, Matches } from 'class-validator';

export class ManualLadvDto {
  @ApiProperty({ example: 'LADV-MS-12345678' })
  @IsString()
  @Matches(/^LADV-[A-Z]{2}-\d{4,12}$/, {
    message: 'ladvNumber must match LADV-UF-NNNNN format',
  })
  ladvNumber!: string;

  @ApiProperty({ example: '2026-05-10T00:00:00Z' })
  @Type(() => Date)
  @IsDate()
  ladvIssuedAt!: Date;

  @ApiProperty({ example: '2026-11-10T00:00:00Z' })
  @Type(() => Date)
  @IsDate()
  ladvValidUntil!: Date;
}
```

- [ ] **Step 2.3: Commit**

```bash
git add src/modules/ladv-process/dto/
git commit -m "feat(ladv-process): DTOs de status e entrada manual"
```

---

## Task 3: `LadvProcessService` com TDD

**Files:**

- Create: `src/modules/ladv-process/ladv-process.service.ts`
- Create: `src/modules/ladv-process/ladv-process.service.spec.ts`

- [ ] **Step 3.1: Escrever os testes (TDD)**

```typescript
// src/modules/ladv-process/ladv-process.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LadvProcessService } from './ladv-process.service';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';

jest.mock('tesseract.js', () => ({
  recognize: jest.fn(),
}));
import * as Tesseract from 'tesseract.js';

describe('LadvProcessService', () => {
  let service: LadvProcessService;
  let prisma: {
    student: { findUnique: jest.Mock; update: jest.Mock };
  };
  let journey: { refresh: jest.Mock };

  beforeEach(async () => {
    prisma = {
      student: { findUnique: jest.fn(), update: jest.fn() },
    };
    journey = {
      refresh: jest.fn().mockResolvedValue({ stage: 'LADV_UPLOADED_VALID' }),
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        LadvProcessService,
        { provide: PrismaService, useValue: prisma },
        { provide: JourneyService, useValue: journey },
      ],
    }).compile();
    service = mod.get(LadvProcessService);
    (Tesseract.recognize as jest.Mock).mockReset();
  });

  describe('getGuide', () => {
    it('returns MS-specific instructions for the official CNH do Brasil app', () => {
      const g = service.getGuide('MS');
      expect(g.uf).toBe('MS');
      expect(
        g.steps.some((s) => /cnh do brasil|detran-ms/i.test(s)),
      ).toBe(true);
    });

    it('returns generic fallback for any UF that is not MS', () => {
      const g = service.getGuide('SP');
      expect(g.uf).toBe('SP');
      expect(
        g.steps.every((s) => !/detran-ms\.gov\.br/i.test(s)),
      ).toBe(true);
    });
  });

  describe('getMine', () => {
    it('returns canBook=true when status=PASS and validUntil is in the future', async () => {
      prisma.student.findUnique.mockResolvedValue({
        ladvNumber: 'LADV-MS-1',
        ladvIssuedAt: new Date('2026-01-01'),
        ladvValidUntil: new Date(Date.now() + 86400000),
        ladvOcrConfidence: 0.91,
        ladvOcrStatus: 'PASS',
        ladv_document_url: '/uploads/ladv/x.pdf',
        journeyStage: 'LADV_UPLOADED_VALID',
      });
      const r = await service.getMine('stu-1');
      expect(r.canBook).toBe(true);
      expect(r.stage).toBe('LADV_UPLOADED_VALID');
    });

    it('returns canBook=false when validUntil is past', async () => {
      prisma.student.findUnique.mockResolvedValue({
        ladvNumber: 'LADV-MS-1',
        ladvIssuedAt: new Date('2020-01-01'),
        ladvValidUntil: new Date('2020-06-01'),
        ladvOcrConfidence: 0.91,
        ladvOcrStatus: 'PASS',
        ladv_document_url: '/uploads/ladv/x.pdf',
        journeyStage: 'AWAITING_LADV_UPLOAST',
      });
      const r = await service.getMine('stu-1');
      expect(r.canBook).toBe(false);
    });
  });

  describe('uploadFromFile', () => {
    it('saves all five new fields and refreshes journey on PASS', async () => {
      (Tesseract.recognize as jest.Mock).mockResolvedValue({
        data: {
          text:
            'LADV nº LADV-MS-12345678\nLICENÇA DE APRENDIZAGEM DETRAN-MS\nEmitida em 10/05/2026 Válida até 10/11/2030',
          confidence: 85,
        },
      });
      prisma.student.update.mockResolvedValue({});
      prisma.student.findUnique.mockResolvedValue({
        ladvNumber: 'LADV-MS-12345678',
        ladvIssuedAt: new Date('2026-05-10'),
        ladvValidUntil: new Date('2030-11-10'),
        ladvOcrConfidence: 85,
        ladvOcrStatus: 'PASS',
        ladv_document_url: '/uploads/ladv/stu-1/file.pdf',
        journeyStage: 'LADV_UPLOADED_VALID',
      });

      const r = await service.uploadFromFile('stu-1', '/uploads/ladv/stu-1/file.pdf');

      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 'stu-1' },
        data: expect.objectContaining({
          ladvNumber: 'LADV-MS-12345678',
          ladvOcrConfidence: 85,
          ladvOcrStatus: 'PASS',
          ladvUploaded: true,
          ladv_document_url: '/uploads/ladv/stu-1/file.pdf',
        }),
      });
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
      expect(r.ladvOcrStatus).toBe('PASS');
    });

    it('persists NEEDS_REVIEW when number cannot be parsed but keywords match', async () => {
      (Tesseract.recognize as jest.Mock).mockResolvedValue({
        data: {
          text:
            'LICENÇA DE APRENDIZAGEM DETRAN-MS Emitida em 10/05/2026 Válida até 10/11/2030',
          confidence: 80,
        },
      });
      prisma.student.update.mockResolvedValue({});
      prisma.student.findUnique.mockResolvedValue({
        ladvNumber: null,
        ladvIssuedAt: new Date('2026-05-10'),
        ladvValidUntil: new Date('2030-11-10'),
        ladvOcrConfidence: 80,
        ladvOcrStatus: 'NEEDS_REVIEW',
        ladv_document_url: '/uploads/ladv/stu-1/file2.pdf',
        journeyStage: 'AWAITING_LADV_UPLOAD',
      });
      const r = await service.uploadFromFile('stu-1', '/uploads/ladv/stu-1/file2.pdf');
      expect(r.ladvOcrStatus).toBe('NEEDS_REVIEW');
    });

    it('throws BadRequestException with FAIL status when confidence is below 50', async () => {
      (Tesseract.recognize as jest.Mock).mockResolvedValue({
        data: { text: 'qualquer coisa', confidence: 30 },
      });
      await expect(
        service.uploadFromFile('stu-1', '/uploads/ladv/stu-1/bad.pdf'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('saveManual', () => {
    it('persists manual LADV with status=NEEDS_REVIEW and refreshes journey', async () => {
      prisma.student.update.mockResolvedValue({});
      prisma.student.findUnique.mockResolvedValue({
        ladvNumber: 'LADV-MS-9999',
        ladvIssuedAt: new Date('2026-05-10'),
        ladvValidUntil: new Date('2030-11-10'),
        ladvOcrConfidence: null,
        ladvOcrStatus: 'NEEDS_REVIEW',
        ladv_document_url: null,
        journeyStage: 'AWAITING_LADV_UPLOAD',
      });
      const r = await service.saveManual('stu-1', {
        ladvNumber: 'LADV-MS-9999',
        ladvIssuedAt: new Date('2026-05-10'),
        ladvValidUntil: new Date('2030-11-10'),
      });
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 'stu-1' },
        data: expect.objectContaining({
          ladvNumber: 'LADV-MS-9999',
          ladvOcrStatus: 'NEEDS_REVIEW',
          ladvOcrConfidence: null,
        }),
      });
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
      expect(r.ladvOcrStatus).toBe('NEEDS_REVIEW');
    });

    it('rejects when validUntil is in the past', async () => {
      await expect(
        service.saveManual('stu-1', {
          ladvNumber: 'LADV-MS-9999',
          ladvIssuedAt: new Date('2020-01-01'),
          ladvValidUntil: new Date('2020-06-01'),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 3.2: Rodar os testes — devem falhar**

```bash
npm test -- ladv-process.service
```

- [ ] **Step 3.3: Implementar `ladv-process.service.ts`**

```typescript
// src/modules/ladv-process/ladv-process.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';
import { extractLadvFields, LadvOcrResult } from './lib/ladv-ocr';
import { LadvStatusDto } from './dto/ladv-status.dto';
import { ManualLadvDto } from './dto/manual-ladv.dto';

const UF_GUIDES: Record<string, { steps: string[] }> = {
  MS: {
    steps: [
      'Baixe o app CNH do Brasil (Senatran/Ministério dos Transportes)',
      'Faça login com gov.br e selecione "Solicitar LADV"',
      'Confirme seus dados pessoais e a categoria B',
      'Aguarde a emissão pelo DETRAN-MS (https://www.detran.ms.gov.br) — você receberá uma notificação no app',
      'Salve o PDF gerado e faça o upload aqui em /ladv/me/upload',
    ],
  },
};

@Injectable()
export class LadvProcessService {
  private readonly logger = new Logger(LadvProcessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly journey: JourneyService,
  ) {}

  getGuide(uf: string): { uf: string; steps: string[] } {
    const normalized = (uf ?? '').toUpperCase();
    const guide = UF_GUIDES[normalized];
    if (guide) return { uf: normalized, steps: guide.steps };
    return {
      uf: normalized,
      steps: [
        'Baixe o app CNH do Brasil disponível na Apple Store e Google Play',
        'Faça login com gov.br e siga as instruções do seu DETRAN',
        'Aguarde a emissão da LADV pelo seu DETRAN',
        'Faça o upload do PDF aqui em /ladv/me/upload',
      ],
    };
  }

  async getMine(studentId: string): Promise<LadvStatusDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        ladvNumber: true,
        ladvIssuedAt: true,
        ladvValidUntil: true,
        ladvOcrConfidence: true,
        ladvOcrStatus: true,
        ladv_document_url: true,
        journeyStage: true,
      },
    });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    const canBook =
      student.ladvOcrStatus === 'PASS' &&
      !!student.ladvValidUntil &&
      student.ladvValidUntil > new Date();
    return {
      ladvNumber: student.ladvNumber,
      ladvIssuedAt: student.ladvIssuedAt,
      ladvValidUntil: student.ladvValidUntil,
      ladvOcrConfidence: student.ladvOcrConfidence,
      ladvOcrStatus: student.ladvOcrStatus as LadvStatusDto['ladvOcrStatus'],
      ladvDocumentUrl: student.ladv_document_url,
      stage: student.journeyStage,
      canBook,
    };
  }

  private async persist(
    studentId: string,
    parsed: LadvOcrResult,
    documentUrl: string | null,
  ): Promise<LadvStatusDto> {
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        ladvNumber: parsed.ladvNumber,
        ladvIssuedAt: parsed.issuedAt,
        ladvValidUntil: parsed.validUntil,
        ladvOcrConfidence: parsed.confidence === 0 ? null : parsed.confidence,
        ladvOcrStatus: parsed.status,
        ladvUploaded: parsed.status === 'PASS',
        ladv_document_url: documentUrl,
        ladv_validation_date: new Date(),
      },
    });
    await this.journey.refresh(studentId);
    return this.getMine(studentId);
  }

  async uploadFromFile(
    studentId: string,
    filePath: string,
  ): Promise<LadvStatusDto> {
    this.logger.log(`Starting OCR for student ${studentId} LADV: ${filePath}`);
    let recognition: { text: string; confidence: number };
    try {
      const { data } = await Tesseract.recognize(filePath, 'por');
      recognition = { text: data.text, confidence: data.confidence };
    } catch (e) {
      this.logger.error(`Tesseract error: ${(e as Error).message}`);
      throw new BadRequestException(
        'Failed to process LADV document — try uploading a clearer image',
      );
    }

    const parsed = extractLadvFields(recognition.text, recognition.confidence);
    if (parsed.status === 'FAIL') {
      throw new BadRequestException(
        `LADV document failed OCR (confidence ${recognition.confidence}%, keywords missing or unreadable)`,
      );
    }
    return this.persist(studentId, parsed, filePath);
  }

  async saveManual(
    studentId: string,
    dto: ManualLadvDto,
  ): Promise<LadvStatusDto> {
    if (dto.ladvValidUntil <= new Date()) {
      throw new BadRequestException('ladvValidUntil must be in the future');
    }
    return this.persist(
      studentId,
      {
        ladvNumber: dto.ladvNumber,
        issuedAt: dto.ladvIssuedAt,
        validUntil: dto.ladvValidUntil,
        confidence: 0,
        status: 'NEEDS_REVIEW',
      },
      null,
    );
  }
}
```

- [ ] **Step 3.4: Rodar os testes — devem passar**

```bash
npm test -- ladv-process.service
```

Esperado: `PASS — Tests: 8 passed`.

- [ ] **Step 3.5: Commit**

```bash
git add src/modules/ladv-process/ladv-process.service.ts src/modules/ladv-process/ladv-process.service.spec.ts
git commit -m "feat(ladv-process): service com guide MS, upload OCR, entrada manual e journey refresh"
```

---

## Task 4: `LadvProcessController` + module + e2e

**Files:**

- Create: `src/modules/ladv-process/ladv-process.controller.ts`
- Create: `src/modules/ladv-process/ladv-process.module.ts`
- Create: `test/ladv-process.e2e-spec.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 4.1: Controller**

```typescript
// src/modules/ladv-process/ladv-process.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LadvProcessService } from './ladv-process.service';
import { ManualLadvDto } from './dto/manual-ladv.dto';
import { LadvStatusDto } from './dto/ladv-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildUploadStorage,
  MAX_UPLOAD_BYTES,
  uploadFileFilter,
} from '../../common/uploads/upload-storage';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('ladv-process')
@ApiBearerAuth()
@Controller('ladv')
@UseGuards(JwtAuthGuard)
export class LadvProcessController {
  constructor(private readonly service: LadvProcessService) {}

  @Get('guide')
  @ApiOkResponse()
  guide(@Query('uf') uf: string) {
    if (!uf) throw new BadRequestException('Query param "uf" is required');
    return this.service.getGuide(uf);
  }

  @Get('me')
  @ApiOkResponse({ type: LadvStatusDto })
  getMine(@Req() req: RequestWithUser): Promise<LadvStatusDto> {
    return this.service.getMine(req.user.id);
  }

  @Post('me/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: LadvStatusDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildUploadStorage('ladv'),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  upload(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<LadvStatusDto> {
    if (!file) throw new BadRequestException('LADV file is required');
    return this.service.uploadFromFile(req.user.id, file.path);
  }

  @Post('me/manual')
  @ApiOkResponse({ type: LadvStatusDto })
  manual(
    @Req() req: RequestWithUser,
    @Body() dto: ManualLadvDto,
  ): Promise<LadvStatusDto> {
    return this.service.saveManual(req.user.id, dto);
  }
}
```

- [ ] **Step 4.2: Module**

```typescript
// src/modules/ladv-process/ladv-process.module.ts
import { Module } from '@nestjs/common';
import { LadvProcessController } from './ladv-process.controller';
import { LadvProcessService } from './ladv-process.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JourneyModule, AuthModule],
  controllers: [LadvProcessController],
  providers: [LadvProcessService],
  exports: [LadvProcessService],
})
export class LadvProcessModule {}
```

- [ ] **Step 4.3: Importar no `AppModule`**

```typescript
import { LadvProcessModule } from './modules/ladv-process/ladv-process.module';

// imports[]:
    LadvProcessModule,
```

- [ ] **Step 4.4: E2E**

```typescript
// test/ladv-process.e2e-spec.ts
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

describe('LadvProcess (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /ladv/guide?uf=MS returns DETRAN-MS / CNH do Brasil instructions', async () => {
    const token = await login(app, 'student-awaiting-ladv@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/ladv/guide?uf=MS')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.uf).toBe('MS');
    expect(
      res.body.data.steps.some((s: string) =>
        /cnh do brasil|detran-ms/i.test(s),
      ),
    ).toBe(true);
  });

  it('POST /ladv/me/manual transitions AWAITING_LADV_UPLOAD → LADV_UPLOADED_VALID', async () => {
    const token = await login(app, 'student-awaiting-ladv@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/ladv/me/manual')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ladvNumber: 'LADV-MS-77777',
        ladvIssuedAt: new Date().toISOString(),
        ladvValidUntil: new Date(
          Date.now() + 365 * 86400000,
        ).toISOString(),
      })
      .expect(201);

    // /journey/me should reflect the new stage. Manual entry sets
    // ladvOcrStatus=NEEDS_REVIEW which DOES NOT count as PASS for journey.
    // So we expect AWAITING_LADV_UPLOAD to persist (manual is for review queue).
    const journey = await request(app.getHttpServer())
      .get('/api/v1/journey/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(journey.body.data.stage).toBe('AWAITING_LADV_UPLOAD');
  });

  it('POST /ladv/me/manual rejects validUntil in the past', async () => {
    const token = await login(app, 'student-awaiting-ladv@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/ladv/me/manual')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ladvNumber: 'LADV-MS-77777',
        ladvIssuedAt: '2020-01-01T00:00:00Z',
        ladvValidUntil: '2020-06-01T00:00:00Z',
      })
      .expect(400);
  });

  it('GET /ladv/me returns canBook=true for student-ladv (PASS status)', async () => {
    const token = await login(app, 'student-ladv@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/ladv/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.canBook).toBe(true);
    expect(res.body.data.ladvOcrStatus).toBe('PASS');
  });
});
```

- [ ] **Step 4.5: Rodar build + e2e**

```bash
npm run build && npm run test:e2e -- ladv-process
```

Esperado: 4 testes passando.

- [ ] **Step 4.6: Commit**

```bash
git add src/modules/ladv-process/ladv-process.controller.ts src/modules/ladv-process/ladv-process.module.ts src/app.module.ts test/ladv-process.e2e-spec.ts
git commit -m "feat(ladv-process): controller + module + e2e em /api/v1/ladv"
```

---

## Task 5: Cadeia de validação em `LessonsService.create()`

Substitui o check legado `if (!student.ladvUploaded)` pela cadeia de 6 verificações da seção 7 da spec.

**Files:**

- Modify: `src/modules/lessons/lessons.service.ts`
- Modify: `src/modules/lessons/lessons.service.spec.ts`
- Modify: `src/modules/lessons/lessons.module.ts`

- [ ] **Step 5.1: Atualizar `lessons.module.ts` para importar `JourneyModule` e `ValidationModule`**

```typescript
// src/modules/lessons/lessons.module.ts
import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TelemetriaModule } from '../telemetria/telemetria.module';
import { PaymentsModule } from '../payments/payments.module';
import { JourneyModule } from '../journey/journey.module';
import { ValidationModule } from '../validation/validation.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    TelemetriaModule,
    PaymentsModule,
    JourneyModule,
    ValidationModule,
    AuthModule,
  ],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
```

(Manter os imports/providers já existentes — esta edição apenas **adiciona** `JourneyModule` e `ValidationModule`. Se o arquivo atual já tem `TelemetriaModule`/`PaymentsModule` ou `AuthModule`, preservar.)

- [ ] **Step 5.2: Substituir o início de `LessonsService.create()`**

Em `src/modules/lessons/lessons.service.ts`:

1. Adicionar imports e injetar as dependências novas:

```typescript
import { JourneyService } from '../journey/journey.service';
import { ValidationService } from '../validation/validation.service';
import { ConfigService } from '@nestjs/config';
import {
  DOCUMENT_VALIDATION_PROVIDER,
  DocumentValidationProvider,
} from '../validation/providers/document-validation.provider';
import { Inject } from '@nestjs/common';

// ...

constructor(
  private prisma: PrismaService,
  private shield: ShieldService,
  private asaasService: AsaasService,
  private journey: JourneyService,
  private validation: ValidationService,
  private config: ConfigService,
  @Inject(DOCUMENT_VALIDATION_PROVIDER)
  private documentValidation: DocumentValidationProvider,
) {}
```

2. Substituir o bloco de validação no início de `create()` (linhas ~29-41 do arquivo atual) por:

```typescript
async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
  // === STAGE 1: Journey gate (LADV válida + stage >= LADV_UPLOADED_VALID) ===
  await this.journey.assertCanScheduleLesson(createLessonDto.studentId);

  // === STAGE 2: Instructor credential ===
  const instructor = await this.prisma.instructor.findUnique({
    where: { id: createLessonDto.instructorId },
  });
  if (!instructor) {
    throw new BadRequestException('Instructor not found');
  }
  if (instructor.credentialStatus !== 'APPROVED') {
    throw new BadRequestException(
      `Instructor credential is ${instructor.credentialStatus} — only APPROVED is allowed`,
    );
  }
  if (
    !instructor.credentialValidUntil ||
    instructor.credentialValidUntil <= new Date()
  ) {
    throw new BadRequestException(
      'Instructor DETRAN credential is expired',
    );
  }

  // === STAGE 3: Instructor CNH local check + expiry ===
  const cnhLocal = this.validation.validateCpf
    ? undefined
    : undefined; // (no-op — use ValidationService below)
  const cnhResult = await this.validation.validateCnh(
    instructor.cnh,
    instructor.cpf,
  );
  if (cnhResult.status === 'LOCAL_INVALID') {
    throw new BadRequestException(
      'Instructor CNH number failed local validation',
    );
  }
  if (!instructor.cnhExpiry || new Date(instructor.cnhExpiry) <= new Date()) {
    throw new BadRequestException('Instructor CNH is expired');
  }

  // === STAGE 4: SERPRO-style external check (only when provider=serpro) ===
  const externalProvider =
    this.config.get<string>('DOCUMENT_VALIDATION_PROVIDER') ?? 'mock';
  if (externalProvider === 'serpro') {
    const external = await this.documentValidation.validateCnh(
      instructor.cnh,
      instructor.cpf,
    );
    if (!external.valid) {
      throw new BadRequestException(
        `Instructor CNH rejected by external provider (status=${external.status})`,
      );
    }
  }

  // === STAGE 5: Vehicle plate exists and active ===
  if (createLessonDto.vehicleId) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: createLessonDto.vehicleId },
    });
    if (!vehicle || vehicle.instructorId !== createLessonDto.instructorId) {
      throw new BadRequestException(
        'Vehicle does not belong to the selected instructor',
      );
    }
    if (vehicle.isActive === false) {
      throw new BadRequestException('Vehicle is inactive');
    }
  }

  // === STAGE 6: Booking (existing transaction) ===
  return this.prisma.$transaction(async (tx) => {
    const existingLesson = await tx.lesson.findFirst({
      where: {
        instructorId: createLessonDto.instructorId,
        date: new Date(createLessonDto.date),
        startTime: createLessonDto.startTime,
      },
    });

    if (existingLesson) {
      throw new ConflictException(
        'Slot is already occupied by another lesson',
      );
    }

    const busySlots = await tx.busySlot.findMany({
      where: {
        instructorId: createLessonDto.instructorId,
        date: new Date(createLessonDto.date),
      },
    });

    const lessonStart = createLessonDto.startTime;
    const lessonEnd = createLessonDto.endTime;

    const isBusyConflict = busySlots.some((bs) => {
      return lessonStart < bs.endTime && lessonEnd > bs.startTime;
    });

    if (isBusyConflict) {
      throw new ConflictException(
        'Instructor is busy at this time (blocked slot)',
      );
    }

    return tx.lesson.create({
      data: {
        studentId: createLessonDto.studentId,
        instructorId: createLessonDto.instructorId,
        // ... (manter o resto do bloco original)
      },
    });
  });
}
```

**Importante:** preservar TODO o restante do arquivo (métodos `getLesson`, `confirmBiometry`, `complete`, `cancel`, etc.) sem alterações. Apenas o bloco de validação inicial é trocado. O retorno do `tx.lesson.create({...})` deve manter o objeto `data` original — completar com os campos existentes (não substituir).

3. Limpar a linha quebrada que ficou da edição: remover o trecho `const cnhLocal = this.validation.validateCpf ? undefined : undefined;` é apenas um marker — basta excluí-lo. (Removido na implementação real.)

- [ ] **Step 5.3: Atualizar `lessons.service.spec.ts`**

Substituir/expandir o spec existente para cobrir cada link da cadeia. O arquivo atual é stub (485B) — sobrescrever inteiro:

```typescript
// src/modules/lessons/lessons.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShieldService } from '../telemetria/shield.service';
import { AsaasService } from '../payments/asaas.service';
import { JourneyService } from '../journey/journey.service';
import { ValidationService } from '../validation/validation.service';
import { ConfigService } from '@nestjs/config';
import { DOCUMENT_VALIDATION_PROVIDER } from '../validation/providers/document-validation.provider';

describe('LessonsService.create — validation chain', () => {
  let service: LessonsService;
  let prisma: any;
  let journey: { assertCanScheduleLesson: jest.Mock };
  let validation: { validateCnh: jest.Mock };
  let documentValidation: { validateCnh: jest.Mock };

  const baseInstructor = {
    id: 'inst-1',
    cnh: '02650306461',
    cpf: '11144477735',
    cnhExpiry: new Date(Date.now() + 365 * 86400000).toISOString(),
    credentialStatus: 'APPROVED',
    credentialValidUntil: new Date(Date.now() + 365 * 86400000),
  };

  const validDto = {
    studentId: 'stu-1',
    instructorId: 'inst-1',
    date: '2026-06-01',
    startTime: '10:00',
    endTime: '11:00',
  } as any;

  beforeEach(async () => {
    prisma = {
      instructor: { findUnique: jest.fn() },
      vehicle: { findUnique: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (cb: any) =>
        cb({
          lesson: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'lsn-1' }),
          },
          busySlot: { findMany: jest.fn().mockResolvedValue([]) },
        }),
      ),
    };
    journey = { assertCanScheduleLesson: jest.fn().mockResolvedValue(undefined) };
    validation = {
      validateCnh: jest
        .fn()
        .mockResolvedValue({ valid: true, status: 'VALID' }),
    };
    documentValidation = { validateCnh: jest.fn() };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ShieldService, useValue: {} },
        { provide: AsaasService, useValue: {} },
        { provide: JourneyService, useValue: journey },
        { provide: ValidationService, useValue: validation },
        {
          provide: ConfigService,
          useValue: { get: () => 'mock' },
        },
        {
          provide: DOCUMENT_VALIDATION_PROVIDER,
          useValue: documentValidation,
        },
      ],
    }).compile();
    service = mod.get(LessonsService);
  });

  it('rejects when journey gate fails', async () => {
    journey.assertCanScheduleLesson.mockRejectedValue(
      new BadRequestException('stage too low'),
    );
    await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
  });

  it('rejects when instructor credentialStatus != APPROVED', async () => {
    prisma.instructor.findUnique.mockResolvedValue({
      ...baseInstructor,
      credentialStatus: 'PENDING',
    });
    await expect(service.create(validDto)).rejects.toThrow(
      /credential is PENDING/,
    );
  });

  it('rejects when instructor credentialValidUntil is past', async () => {
    prisma.instructor.findUnique.mockResolvedValue({
      ...baseInstructor,
      credentialValidUntil: new Date('2020-01-01'),
    });
    await expect(service.create(validDto)).rejects.toThrow(
      /credential is expired/,
    );
  });

  it('rejects when CNH is locally invalid', async () => {
    prisma.instructor.findUnique.mockResolvedValue({
      ...baseInstructor,
      cnh: '11111111111',
    });
    validation.validateCnh.mockResolvedValue({
      valid: false,
      status: 'LOCAL_INVALID',
    });
    await expect(service.create(validDto)).rejects.toThrow(
      /CNH number failed local validation/,
    );
  });

  it('rejects when CNH expiry is past', async () => {
    prisma.instructor.findUnique.mockResolvedValue({
      ...baseInstructor,
      cnhExpiry: '2020-01-01',
    });
    await expect(service.create(validDto)).rejects.toThrow(/CNH is expired/);
  });

  it('rejects when SERPRO provider rejects the CNH (env=serpro)', async () => {
    prisma.instructor.findUnique.mockResolvedValue(baseInstructor);
    // override config to serpro for this test
    (service as any).config = { get: () => 'serpro' };
    documentValidation.validateCnh.mockResolvedValue({
      valid: false,
      status: 'SUSPENDED',
    });
    await expect(service.create(validDto)).rejects.toThrow(
      /rejected by external provider/,
    );
  });

  it('passes when all six checks succeed', async () => {
    prisma.instructor.findUnique.mockResolvedValue(baseInstructor);
    const r = await service.create(validDto);
    expect(r.id).toBe('lsn-1');
    expect(journey.assertCanScheduleLesson).toHaveBeenCalledWith('stu-1');
  });

  it('rejects when vehicle is inactive', async () => {
    prisma.instructor.findUnique.mockResolvedValue(baseInstructor);
    prisma.vehicle.findUnique.mockResolvedValue({
      id: 'veh-1',
      instructorId: 'inst-1',
      isActive: false,
    });
    await expect(
      service.create({ ...validDto, vehicleId: 'veh-1' }),
    ).rejects.toThrow(/Vehicle is inactive/);
  });
});
```

- [ ] **Step 5.4: Rodar os testes**

```bash
npm test -- lessons.service
```

Esperado: 8 testes passando.

- [ ] **Step 5.5: Build sanity-check**

```bash
npm run build
```

- [ ] **Step 5.6: Commit**

```bash
git add src/modules/lessons/lessons.service.ts src/modules/lessons/lessons.service.spec.ts src/modules/lessons/lessons.module.ts
git commit -m "feat(lessons): cadeia de 6 validações em create() (journey + credencial + CNH + veículo)"
```

---

## Task 6: E2E do gate de criação de aulas

**Files:**

- Create: `test/lessons-gate.e2e-spec.ts`

- [ ] **Step 6.1: Escrever o e2e**

```typescript
// test/lessons-gate.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const login = async (
  app: INestApplication,
  email: string,
): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: '123456' });
  return res.body.data?.token ?? res.body.token;
};

describe('Lessons gate (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let approvedInstructorId: string;

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
    prisma = app.get(PrismaService);
    const instructor = await prisma.instructor.findFirst({
      where: { credentialStatus: 'APPROVED' },
    });
    if (!instructor) {
      throw new Error(
        'No APPROVED instructor seeded — review prisma/seed.ts after this sub-plan',
      );
    }
    approvedInstructorId = instructor.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects lesson creation when stage < LADV_UPLOADED_VALID', async () => {
    const token = await login(app, 'student-registered@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({
        studentId: 'placeholder',
        instructorId: approvedInstructorId,
        date: '2026-06-01',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect((res) => {
        if (![400, 401, 403].includes(res.status)) {
          throw new Error(
            `Expected 400/401/403 (journey gate), got ${res.status}`,
          );
        }
      });
  });

  it('rejects when instructor credentialStatus=EXPIRED', async () => {
    const expiredInstructor = await prisma.instructor.findFirst({
      where: { credentialStatus: 'EXPIRED' },
    });
    if (!expiredInstructor) {
      // skipped if seed does not have an EXPIRED instructor
      return;
    }
    const token = await login(app, 'student-ladv@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({
        studentId: 'placeholder',
        instructorId: expiredInstructor.id,
        date: '2026-06-01',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(400);
  });

  it('accepts lesson creation for student-ladv with APPROVED instructor', async () => {
    const token = await login(app, 'student-ladv@email.com');
    const student = await prisma.student.findUnique({
      where: { email: 'student-ladv@email.com' },
    });
    await request(app.getHttpServer())
      .post('/api/v1/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({
        studentId: student?.id,
        instructorId: approvedInstructorId,
        date: '2026-07-01',
        startTime: '14:00',
        endTime: '15:00',
      })
      .expect((res) => {
        if (![200, 201].includes(res.status)) {
          throw new Error(
            `Expected 200/201 for valid lesson, got ${res.status}: ${JSON.stringify(res.body)}`,
          );
        }
      });
  });
});
```

- [ ] **Step 6.2: Rodar o e2e**

```bash
npm run test:e2e -- lessons-gate
```

Esperado: 3 testes passando (2º pode ser skipped se seed não tem EXPIRED instructor; será garantido na Task 9).

- [ ] **Step 6.3: Commit**

```bash
git add test/lessons-gate.e2e-spec.ts
git commit -m "test(lessons): e2e do gate de criação de aulas (journey + credencial + APPROVED)"
```

---

## Task 7: Estender `CredentialsWorker` com `credentialValidUntil` e `ladvValidUntil`

**Files:**

- Modify: `src/modules/compliance/credentials.worker.ts`
- Modify: `src/modules/compliance/credentials.worker.spec.ts`

- [ ] **Step 7.1: Escrever testes novos (TDD — adicionar ao spec existente)**

Em `src/modules/compliance/credentials.worker.spec.ts`, adicionar (junto aos describes já existentes) — ou substituir o arquivo inteiro mantendo cobertura atual:

```typescript
// src/modules/compliance/credentials.worker.spec.ts (versão consolidada)
import { Test, TestingModule } from '@nestjs/testing';
import { CredentialsWorker } from './credentials.worker';
import { PrismaService } from '../prisma/prisma.service';

describe('CredentialsWorker', () => {
  let worker: CredentialsWorker;
  let prisma: {
    instructor: { findMany: jest.Mock; updateMany: jest.Mock };
    student: { findMany: jest.Mock; updateMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      instructor: { findMany: jest.fn(), updateMany: jest.fn() },
      student: { findMany: jest.fn(), updateMany: jest.fn() },
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsWorker,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    worker = mod.get(CredentialsWorker);
  });

  it('blocks instructors with expired CNH (legacy isActive=false)', async () => {
    prisma.instructor.findMany.mockImplementation(({ where }) => {
      if (where.cnhExpiry) {
        return Promise.resolve([
          { id: 'i1', name: 'X', cnhExpiry: '2020-01-01' },
        ]);
      }
      return Promise.resolve([]);
    });
    prisma.student.findMany.mockResolvedValue([]);

    await worker.handleExpiredCredentials();

    expect(prisma.instructor.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['i1'] } },
        data: { isActive: false },
      }),
    );
  });

  it('marks instructors with expired credentialValidUntil as credentialStatus=EXPIRED + stripeAccountStatus=RESTRICTED', async () => {
    prisma.instructor.findMany.mockImplementation(({ where }) => {
      if (where.credentialValidUntil) {
        return Promise.resolve([
          { id: 'i2', name: 'Y', credentialStatus: 'APPROVED' },
        ]);
      }
      return Promise.resolve([]);
    });
    prisma.student.findMany.mockResolvedValue([]);

    await worker.handleExpiredCredentials();

    expect(prisma.instructor.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['i2'] } },
      data: {
        credentialStatus: 'EXPIRED',
        stripeAccountStatus: 'RESTRICTED',
      },
    });
  });

  it('marks students with expired ladvValidUntil as ladvOcrStatus=FAIL', async () => {
    prisma.instructor.findMany.mockResolvedValue([]);
    prisma.student.findMany.mockImplementation(({ where }) => {
      if (where.ladvValidUntil) {
        return Promise.resolve([{ id: 's1' }]);
      }
      return Promise.resolve([]);
    });

    await worker.handleExpiredCredentials();

    expect(prisma.student.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1'] } },
      data: { ladvOcrStatus: 'FAIL', ladvUploaded: false },
    });
  });

  it('runs all three sweeps in a single invocation', async () => {
    prisma.instructor.findMany.mockResolvedValue([]);
    prisma.student.findMany.mockResolvedValue([]);
    await worker.handleExpiredCredentials();
    expect(prisma.instructor.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.student.findMany).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 7.2: Rodar os testes — devem falhar parcialmente**

```bash
npm test -- credentials.worker
```

- [ ] **Step 7.3: Atualizar `credentials.worker.ts`**

Substituir o conteúdo de `src/modules/compliance/credentials.worker.ts`:

```typescript
// src/modules/compliance/credentials.worker.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CredentialsWorker {
  private readonly logger = new Logger(CredentialsWorker.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Daily check for expired credentials.
   * Runs at midnight every day.
   *
   * Sweeps (CONTRAN 1.020/2025):
   * 1. Legacy CNH expiry → instructor.isActive=false
   * 2. DETRAN credential expiry → credentialStatus=EXPIRED + stripeAccountStatus=RESTRICTED
   * 3. LADV expiry → student.ladvOcrStatus=FAIL + ladvUploaded=false
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredCredentials() {
    this.logger.log('Starting daily credentials validation worker...');
    const now = new Date();

    // 1. Legacy CNH expiry
    const expiredCnh = await this.prisma.instructor.findMany({
      where: { cnhExpiry: { lt: now.toISOString() } },
    });
    if (expiredCnh.length > 0) {
      this.logger.warn(
        `Found ${expiredCnh.length} instructors with expired CNH — blocking`,
      );
      await this.prisma.instructor.updateMany({
        where: { id: { in: expiredCnh.map((i) => i.id) } },
        data: { isActive: false },
      });
    }

    // 2. DETRAN credential expiry
    const expiredCredential = await this.prisma.instructor.findMany({
      where: {
        credentialValidUntil: { lt: now },
        credentialStatus: 'APPROVED',
      },
    });
    if (expiredCredential.length > 0) {
      this.logger.warn(
        `Found ${expiredCredential.length} instructors with expired DETRAN credential — marking EXPIRED + RESTRICTED`,
      );
      await this.prisma.instructor.updateMany({
        where: { id: { in: expiredCredential.map((i) => i.id) } },
        data: {
          credentialStatus: 'EXPIRED',
          stripeAccountStatus: 'RESTRICTED',
        },
      });
    }

    // 3. LADV expiry
    const expiredLadv = await this.prisma.student.findMany({
      where: { ladvValidUntil: { lt: now } },
    });
    if (expiredLadv.length > 0) {
      this.logger.warn(
        `Found ${expiredLadv.length} students with expired LADV — invalidating`,
      );
      await this.prisma.student.updateMany({
        where: { id: { in: expiredLadv.map((s) => s.id) } },
        data: { ladvOcrStatus: 'FAIL', ladvUploaded: false },
      });
    }

    this.logger.log('Daily credentials validation worker finished.');
  }

  /**
   * Manual trigger for tests and admin endpoints.
   */
  async triggerManualCheck() {
    return this.handleExpiredCredentials();
  }
}
```

- [ ] **Step 7.4: Rodar os testes — devem passar**

```bash
npm test -- credentials.worker
```

Esperado: `PASS — Tests: 4 passed`.

- [ ] **Step 7.5: Commit**

```bash
git add src/modules/compliance/credentials.worker.ts src/modules/compliance/credentials.worker.spec.ts
git commit -m "feat(compliance): worker checa credentialValidUntil e ladvValidUntil (CONTRAN 1.020/2025)"
```

---

## Task 8: Endpoint `practical-summary` em `compliance/`

**Files:**

- Create: `src/modules/compliance/dto/practical-summary.dto.ts`
- Modify: `src/modules/compliance/compliance.service.ts`
- Modify: `src/modules/compliance/compliance.service.spec.ts`
- Modify: `src/modules/compliance/compliance.controller.ts`
- Create: `test/compliance-practical-summary.e2e-spec.ts`

- [ ] **Step 8.1: DTO de resposta**

```typescript
// src/modules/compliance/dto/practical-summary.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PracticalSummaryDto {
  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  totalCompletedLessons!: number;

  @ApiProperty()
  totalValidatedMinutes!: number;

  @ApiProperty()
  requiredMinutes!: number;

  @ApiProperty()
  meetsMinimumLegal!: boolean;

  @ApiProperty()
  lessonsWithIntegrityIssues!: number;

  @ApiProperty()
  canDeclareReadyForExam!: boolean;
}
```

- [ ] **Step 8.2: Adicionar `getPracticalSummary()` ao `compliance.service.ts`**

Anexar como novo método em `ComplianceService`:

```typescript
async getPracticalSummary(studentId: string) {
  const student = await this.prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      readyForPracticalExamAt: true,
      ladvOcrStatus: true,
      ladvValidUntil: true,
    },
  });
  if (!student) throw new NotFoundException('Student not found');

  const lessons = await this.prisma.lesson.findMany({
    where: { studentId, status: 'completed' },
    select: {
      id: true,
      durationMinutes: true,
      biometryStartStatus: true,
      biometryMidStatus: true,
      biometryEndStatus: true,
      integrityHash: true,
      disputeOpened: true,
    },
  });

  const valid = lessons.filter(
    (l) =>
      (l.durationMinutes ?? 0) >= 50 &&
      l.biometryStartStatus === 'SUCCESS' &&
      l.biometryMidStatus === 'SUCCESS' &&
      l.biometryEndStatus === 'SUCCESS' &&
      l.integrityHash !== null &&
      l.disputeOpened === false,
  );

  const totalValidatedMinutes = valid.reduce(
    (sum, l) => sum + (l.durationMinutes ?? 0),
    0,
  );
  const meetsMinimumLegal = totalValidatedMinutes >= MINIMUM_PRACTICAL_MINUTES;
  const ladvValid =
    student.ladvOcrStatus === 'PASS' &&
    !!student.ladvValidUntil &&
    student.ladvValidUntil > new Date();
  const canDeclareReadyForExam = meetsMinimumLegal && ladvValid;

  return {
    studentId,
    totalCompletedLessons: valid.length,
    totalValidatedMinutes,
    requiredMinutes: MINIMUM_PRACTICAL_MINUTES,
    meetsMinimumLegal,
    lessonsWithIntegrityIssues: lessons.length - valid.length,
    canDeclareReadyForExam,
  };
}
```

(Adicionar `import { PracticalSummaryDto } from './dto/practical-summary.dto';` no topo se desejar declarar o tipo de retorno como `Promise<PracticalSummaryDto>`.)

- [ ] **Step 8.3: Adicionar testes em `compliance.service.spec.ts`**

Acrescentar ao describe existente (sem remover testes atuais):

```typescript
describe('getPracticalSummary', () => {
  it('returns canDeclareReadyForExam=true when 2 valid lessons + LADV PASS', async () => {
    prisma.student.findUnique.mockResolvedValue({
      id: 'stu-1',
      readyForPracticalExamAt: null,
      ladvOcrStatus: 'PASS',
      ladvValidUntil: new Date(Date.now() + 86400000),
    });
    prisma.lesson.findMany.mockResolvedValue([
      {
        durationMinutes: 60,
        biometryStartStatus: 'SUCCESS',
        biometryMidStatus: 'SUCCESS',
        biometryEndStatus: 'SUCCESS',
        integrityHash: 'h1',
        disputeOpened: false,
      },
      {
        durationMinutes: 65,
        biometryStartStatus: 'SUCCESS',
        biometryMidStatus: 'SUCCESS',
        biometryEndStatus: 'SUCCESS',
        integrityHash: 'h2',
        disputeOpened: false,
      },
    ]);
    const r = await service.getPracticalSummary('stu-1');
    expect(r.meetsMinimumLegal).toBe(true);
    expect(r.canDeclareReadyForExam).toBe(true);
    expect(r.totalValidatedMinutes).toBe(125);
  });

  it('does NOT count lessons with biometry failure', async () => {
    prisma.student.findUnique.mockResolvedValue({
      id: 'stu-1',
      readyForPracticalExamAt: null,
      ladvOcrStatus: 'PASS',
      ladvValidUntil: new Date(Date.now() + 86400000),
    });
    prisma.lesson.findMany.mockResolvedValue([
      {
        durationMinutes: 60,
        biometryStartStatus: 'FAILED',
        biometryMidStatus: 'SUCCESS',
        biometryEndStatus: 'SUCCESS',
        integrityHash: 'h1',
        disputeOpened: false,
      },
    ]);
    const r = await service.getPracticalSummary('stu-1');
    expect(r.totalValidatedMinutes).toBe(0);
    expect(r.lessonsWithIntegrityIssues).toBe(1);
    expect(r.meetsMinimumLegal).toBe(false);
  });

  it('canDeclareReadyForExam=false when LADV is expired even if minutes met', async () => {
    prisma.student.findUnique.mockResolvedValue({
      id: 'stu-1',
      readyForPracticalExamAt: null,
      ladvOcrStatus: 'PASS',
      ladvValidUntil: new Date('2020-01-01'),
    });
    prisma.lesson.findMany.mockResolvedValue([
      {
        durationMinutes: 120,
        biometryStartStatus: 'SUCCESS',
        biometryMidStatus: 'SUCCESS',
        biometryEndStatus: 'SUCCESS',
        integrityHash: 'h',
        disputeOpened: false,
      },
    ]);
    const r = await service.getPracticalSummary('stu-1');
    expect(r.meetsMinimumLegal).toBe(true);
    expect(r.canDeclareReadyForExam).toBe(false);
  });
});
```

Garantir que o `prisma` mock no spec tem `lesson: { findMany: jest.fn() }`. Se não tiver, estender no `beforeEach`.

- [ ] **Step 8.4: Rodar testes**

```bash
npm test -- compliance.service
```

- [ ] **Step 8.5: Adicionar endpoint no `compliance.controller.ts`**

```typescript
import { PracticalSummaryDto } from './dto/practical-summary.dto';

// método novo na classe:
@Get('students/:studentId/practical-summary')
@ApiOperation({
  summary: 'Resumo da fase prática (CONTRAN 1.020/2025)',
  description:
    'Soma minutos de aulas válidas conforme isValidForCompliance: status=completed, durationMinutes>=50, biometria 3 pontos SUCCESS, integrityHash não-nulo, disputeOpened=false.',
})
@ApiResponse({ status: 200, type: PracticalSummaryDto })
@ApiResponse({ status: 404, description: 'Aluno não encontrado' })
getPracticalSummary(@Param('studentId') studentId: string) {
  return this.complianceService.getPracticalSummary(studentId);
}
```

- [ ] **Step 8.6: E2E**

```typescript
// test/compliance-practical-summary.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const login = async (
  app: INestApplication,
  email: string,
): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: '123456' });
  return res.body.data?.token ?? res.body.token;
};

describe('Compliance practical-summary (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns canDeclareReadyForExam=true for student-ready (≥120 valid minutes + LADV PASS)', async () => {
    const token = await login(app, 'student-ready@email.com');
    const student = await prisma.student.findUnique({
      where: { email: 'student-ready@email.com' },
    });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/compliance/students/${student!.id}/practical-summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.meetsMinimumLegal).toBe(true);
    expect(res.body.data.canDeclareReadyForExam).toBe(true);
    expect(res.body.data.totalValidatedMinutes).toBeGreaterThanOrEqual(120);
  });

  it('returns meetsMinimumLegal=false for student-ladv (no lessons yet)', async () => {
    const token = await login(app, 'student-ladv@email.com');
    const student = await prisma.student.findUnique({
      where: { email: 'student-ladv@email.com' },
    });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/compliance/students/${student!.id}/practical-summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.meetsMinimumLegal).toBe(false);
    expect(res.body.data.totalValidatedMinutes).toBe(0);
  });
});
```

- [ ] **Step 8.7: Rodar build + e2e**

```bash
npm run build && npm run test:e2e -- compliance-practical-summary
```

- [ ] **Step 8.8: Commit**

```bash
git add src/modules/compliance/dto/practical-summary.dto.ts src/modules/compliance/compliance.service.ts src/modules/compliance/compliance.service.spec.ts src/modules/compliance/compliance.controller.ts test/compliance-practical-summary.e2e-spec.ts
git commit -m "feat(compliance): endpoint practical-summary com isValidForCompliance"
```

---

## Task 9: Seed `student-ready@email.com` + instrutor EXPIRED + Lessons válidas

**Files:**

- Modify: `prisma/seed.ts`
- Modify: `test/journey.e2e-spec.ts`

- [ ] **Step 9.1: Adicionar aluno `student-ready` com Lessons válidas**

Em `prisma/seed.ts`, logo após o bloco do `student-awaiting-ladv` (Task 12 do sub-plano `pre-practical-stages`), inserir:

```typescript
// STAGE: READY_FOR_PRACTICAL_EXAM — todos os anteriores + 2 lessons válidas
const ready = await prisma.student.upsert({
  where: { email: 'student-ready@email.com' },
  update: {},
  create: {
    email: 'student-ready@email.com',
    name: 'Aluno Pronto para Exame Prático',
    cpf: '99999999999',
    password: journeyPassword,
    theoryCourseStartedAt: pastDate(60),
    ladvNumber: 'LADV-MS-READY1',
    ladvIssuedAt: pastDate(40),
    ladvValidUntil: futureDate(300),
    ladvOcrStatus: 'PASS',
    ladvOcrConfidence: 0.94,
    readyForPracticalExamAt: pastDate(1),
    journeyStage: 'READY_FOR_PRACTICAL_EXAM',
  },
});

await prisma.renachProcess.upsert({
  where: { studentId: ready.id },
  update: {},
  create: {
    studentId: ready.id,
    renachNumber: 'RNC-2026-00009',
    ufDetran: 'MS',
    biometryDoneAt: pastDate(55),
    status: 'DONE',
  },
});
await prisma.medicalExam.upsert({
  where: { studentId: ready.id },
  update: {},
  create: {
    studentId: ready.id,
    protocolCode: 'MED-2026-READY',
    result: 'APTO',
    status: 'RESULT_UPLOADED',
    performedAt: pastDate(45),
    validUntil: futureDate(320),
  },
});
await prisma.psychologicalExam.upsert({
  where: { studentId: ready.id },
  update: {},
  create: {
    studentId: ready.id,
    protocolCode: 'PSY-2026-READY',
    result: 'APTO',
    status: 'RESULT_UPLOADED',
    performedAt: pastDate(43),
    validUntil: futureDate(322),
  },
});
await prisma.officialTheoryExam.upsert({
  where: { studentId: ready.id },
  update: {},
  create: {
    studentId: ready.id,
    takenAt: pastDate(30),
    passed: true,
    score: 29,
  },
});

// 2 lessons válidas para somar ≥ 120 min (precisamos do instrutor já seedado)
const instructor = await prisma.instructor.findFirst({
  where: { credentialStatus: 'APPROVED' },
});
if (instructor) {
  const lessonsPayload = [
    {
      date: pastDate(15),
      durationMinutes: 60,
      seq: 1,
    },
    {
      date: pastDate(7),
      durationMinutes: 65,
      seq: 2,
    },
  ];
  for (const l of lessonsPayload) {
    const existing = await prisma.lesson.findFirst({
      where: {
        studentId: ready.id,
        instructorId: instructor.id,
        date: l.date,
      },
    });
    if (existing) continue;
    await prisma.lesson.create({
      data: {
        studentId: ready.id,
        instructorId: instructor.id,
        date: l.date,
        startTime: '10:00',
        endTime: '11:05',
        durationMinutes: l.durationMinutes,
        status: 'completed',
        biometryStartStatus: 'SUCCESS',
        biometryMidStatus: 'SUCCESS',
        biometryEndStatus: 'SUCCESS',
        integrityHash: `ready-seed-hash-${l.seq}`,
        disputeOpened: false,
      },
    });
  }
}
```

**Nota:** os campos `date`, `startTime`, `endTime`, `durationMinutes`, `status`, `biometryStartStatus`, `biometryMidStatus`, `biometryEndStatus`, `integrityHash`, `disputeOpened` devem existir no modelo `Lesson`. Se algum campo não bate exatamente com o schema atual, ajustar para os nomes reais do `prisma/schema.prisma`.

- [ ] **Step 9.2: Adicionar 1 instrutor EXPIRED (para o e2e do gate)**

No mesmo `prisma/seed.ts`, após a criação do instrutor Roberto existente, adicionar:

```typescript
await prisma.instructor.upsert({
  where: { email: 'expired-instructor@email.com' },
  update: {},
  create: {
    email: 'expired-instructor@email.com',
    name: 'Carlos Credencial Vencida',
    cpf: '55555555500',
    password: await bcrypt.hash('123456', 10),
    cnh: '11122233344',
    cnhExpiry: futureDate(365).toISOString(),
    credentialStatus: 'EXPIRED',
    credentialValidUntil: pastDate(10),
  },
});
```

(O nome do campo `password` e a obrigatoriedade dos campos depende do schema atual de `Instructor`. Adaptar para o schema real.)

- [ ] **Step 9.3: Atualizar e2e da journey**

Em `test/journey.e2e-spec.ts`, adicionar caso no array `cases`:

```typescript
{ email: 'student-ready@email.com', expectedStage: 'READY_FOR_PRACTICAL_EXAM' },
```

E o total de casos sobe de 4 para 5; ajustar mensagem do describe se necessário.

- [ ] **Step 9.4: Rodar seed + e2e**

```bash
npx prisma db seed && npm run test:e2e -- journey
```

Esperado: seed idempotente; e2e da journey passa em todos os casos.

- [ ] **Step 9.5: Commit**

```bash
git add prisma/seed.ts test/journey.e2e-spec.ts
git commit -m "feat(seed): student-ready com 2 lessons válidas + instrutor EXPIRED para gate tests"
```

---

## Task 10: Remover endpoints legados `/students/:id/ladv-upload` e `/students/:id/ladv-status`

O endpoint legado escreve apenas em campos antigos (`ladvUploaded`, `ladv_document_url`, `ladv_validation_date`) sem popular os 5 campos novos da Foundation e sem chamar `JourneyService.refresh()`. Como o sub-plano Foundation acabou de migrar o schema e ainda não há frontend consumindo, é o momento certo de remover sem janela de compatibilidade. Os 3 campos antigos do schema **permanecem** porque ainda são lidos pelo `ComplianceService.getComplianceReport()` (cobertura derivada) — `ladv-process.service.ts` continua escrevendo `ladvUploaded` (espelho de `ladvOcrStatus=PASS`) e `ladv_document_url`.

**Files:**

- Modify: `src/modules/students/students.controller.ts`
- Modify: `src/modules/students/students.service.ts`

- [ ] **Step 10.1: Remover endpoints do `students.controller.ts`**

Em `src/modules/students/students.controller.ts`, deletar os blocos abaixo (e seus imports não usados):

```typescript
// REMOVER:
@Post(':id/ladv-upload')
@UseInterceptors(FileInterceptor('file'))
uploadLadv(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
): Promise<Omit<Student, 'password'>> {
  if (!file) {
    throw new BadRequestException('No file uploaded');
  }
  return this.studentsService.uploadLadv(id, file.originalname, file.path);
}

@Get(':id/ladv-status')
getLadvStatus(@Param('id') id: string) {
  return this.studentsService.getLadvStatus(id);
}
```

Limpar imports não mais usados no topo: `UseInterceptors`, `UploadedFile`, `BadRequestException`, `FileInterceptor` — somente se nenhum outro endpoint do arquivo os usar. O `POST /students/me/theory-course/start` (criado no sub-plano `pre-practical-stages`) não usa upload, então provavelmente todos esses imports podem sair.

- [ ] **Step 10.2: Remover métodos do `students.service.ts`**

Em `src/modules/students/students.service.ts`, deletar:

- O `import * as Tesseract from 'tesseract.js';` no topo
- O método `async uploadLadv(id, _fileName, filePath)` completo
- O método `async getLadvStatus(id)` completo

Manter `create`, `findAll`, `findOne`, `update` e qualquer método adicionado no sub-plano `pre-practical-stages` (ex.: `startTheoryCourse`).

- [ ] **Step 10.3: Confirmar que não há outras referências aos métodos removidos**

```bash
grep -rn "uploadLadv\|getLadvStatus" src/ test/ 2>/dev/null
```

Esperado: nenhuma ocorrência (fora dos métodos do `LadvProcessService` que têm nomes diferentes — `uploadFromFile` e `getMine`).

- [ ] **Step 10.4: Build + testes existentes**

```bash
npm run build && npm test
```

Esperado: build limpo. Se algum teste antigo (ex.: `students.controller.spec.ts` ou e2e antigo cobrindo os endpoints removidos) falhar, removê-lo também — esses testes cobriam código deletado.

- [ ] **Step 10.5: Commit**

```bash
git add src/modules/students/students.controller.ts src/modules/students/students.service.ts
git commit -m "remove(students): endpoints legados ladv-upload e ladv-status (substituídos por /ladv/me/*)"
```

---

## Task 11: Atualizar `CLAUDE.md`

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 11.1: Adicionar `ladv-process/` na estrutura de pastas**

Localizar `## Estrutura de Pastas` em `CLAUDE.md` e adicionar (alfabeticamente entre `instructors/` e `lessons/`):

```
├── ladv-process/      # upload + OCR Tesseract + entrada manual da LADV (CONTRAN etapa 7)
```

- [ ] **Step 11.2: Atualizar a nota sobre LADV em "Regras Importantes"**

Substituir o item:

```
- **LADV OCR:** Tesseract.js exige keywords de CNH com >50% de confianca para aprovar aluno
```

por:

```
- **LADV OCR:** Tesseract.js extrai número, emissão e validade. >=50% de confiança + keywords (LADV/LICENÇA/APRENDIZAGEM/DETRAN) → ladvOcrStatus=PASS; sem número/datas → NEEDS_REVIEW; falha → FAIL. Endpoint único `/api/v1/ladv/me/upload` (módulo `ladv-process/`)
- **Cadeia de validação em LessonsService.create():** 6 etapas obrigatórias (journey gate, instructor credential, CNH local + expiry, SERPRO opcional, vehicle ativo, conflito de slot) — qualquer falha rejeita com 400
```

- [ ] **Step 11.3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: documenta ladv-process e cadeia de validação de lessons no CLAUDE.md"
```

---

## Self-Review Checklist (executado antes da entrega)

**Spec coverage** — cada requisito das seções 6, 7, 8 e 11 do spec:

- ✅ Módulo `ladv-process/` com guide + status + upload OCR + manual entry (Seção 6) — Tasks 1, 2, 3, 4
- ✅ Função pura de extração OCR isolada e testada (Seção 7) — Task 1
- ✅ Cadeia de 6 validações em `LessonsService.create()` (Seção 7) — Task 5
- ✅ Gate de LADV válida via `JourneyService.assertCanScheduleLesson` (Seção 7) — Task 5
- ✅ Instrutor `credentialStatus=APPROVED && credentialValidUntil > now` (Seção 7) — Task 5
- ✅ CNH local + expiry + opcional SERPRO (Seção 7) — Task 5
- ✅ Validação de veículo (Seção 7) — Task 5
- ✅ Worker diário marca `credentialStatus=EXPIRED` + `stripeAccountStatus=RESTRICTED` (Seção 8) — Task 7
- ✅ Worker diário marca `ladvOcrStatus=FAIL` para LADV vencida (Seção 8) — Task 7
- ✅ Endpoint `GET /compliance/students/:studentId/practical-summary` (Seção 8) — Task 8
- ✅ `isValidForCompliance(lesson)` aplicado (Seção 8) — Task 8
- ✅ Seed `student-ready@email.com` (Seção 11) — Task 9
- ✅ Endpoints legados `/students/:id/ladv-upload` e `/students/:id/ladv-status` removidos (sem janela de compatibilidade — frontend ainda não consome) — Task 10
- ⏭ `/payments-stripe/disputes/:lessonId/resolve` — sub-plano stripe-migration
- ⏭ Frontend — sub-plano frontend-journey

**Placeholder scan** — sem TBD/TODO/"implement later". O único `// (manter o resto do bloco original)` na Task 5 é uma anotação de **escopo de edição** (não substituir o bloco transacional inteiro, apenas o início), não código a completar. A descrição textual explicita o que preservar.

**Type consistency** — `LadvOcrResult`, `LadvOcrStatus`, `LadvStatusDto`, `ManualLadvDto`, `PracticalSummaryDto` declarados em Tasks 1, 2, 8 e consumidos consistentemente. `JourneyService.assertCanScheduleLesson` (Foundation Task 4) usado em Task 5. `DOCUMENT_VALIDATION_PROVIDER` token (sub-plano validation-and-clinics Task 4) injetado em Task 5. Campos `Instructor.credentialStatus`, `credentialValidUntil`, `stripeAccountStatus`, `Student.ladvOcrStatus`, `ladvValidUntil` da Foundation Task 1 consumidos em Tasks 5, 7, 8.

**Estado terminal deste sub-plano:**

- Módulo `ladv-process/` funcional com OCR extraindo 5 campos novos + entrada manual.
- `LessonsService.create()` blindado por 6 validações sequenciais.
- Worker diário aplica todas as 3 sweeps (CNH legada, credencial DETRAN, LADV).
- Endpoint `practical-summary` com `isValidForCompliance` canônico.
- Aluno `student-ready@email.com` em `READY_FOR_PRACTICAL_EXAM` (seed completo).
- Instrutor EXPIRED seedado para validar rejeição de aula.
- Endpoints legados `/students/:id/ladv-upload` e `/students/:id/ladv-status` removidos do controller e service; campos antigos do schema (`ladvUploaded`, `ladv_document_url`, `ladv_validation_date`) preservados e atualizados pelo `LadvProcessService` para compatibilidade com `ComplianceService.getComplianceReport()`.
- 100% dos testes unitários + e2e verdes.

**Próximo sub-plano:** `2026-05-14-stripe-migration.md` substitui o `payments/` Asaas pelo `payments-stripe/` consumindo `Payment.stripeXxx` e `Instructor.stripeAccountId/Status` (já no schema desde Foundation) e habilita o release de escrow consumindo `isValidForCompliance` deste plano.
