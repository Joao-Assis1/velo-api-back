# Pre-Practical Stages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os 4 módulos verticais que cobrem as etapas pré-aulas-práticas da Resolução CONTRAN 1.020/2025: `renach-process/` (etapa 3 — RENACH + biometria DETRAN), `medical-exam/` (etapa 4 — exame médico), `psychological-exam/` (etapa 5 — avaliação psicológica) e `theory-exam-official/` (etapa 6 — exame teórico oficial). Adicionalmente, expor `POST /students/me/theory-course/start` (etapa 2). Cada módulo registra mutações via `JourneyService.refresh()` para manter o cache de `journeyStage` sincronizado e habilitar o passo seguinte do stepper.

**Architecture:** Quatro módulos NestJS verticais e independentes, todos seguindo o padrão estabelecido pelo Foundation: `controller → service → DTOs`. Uploads multipart usam `FileInterceptor` do `@nestjs/platform-express` com `diskStorage` configurado por módulo gravando em `uploads/{module}/{studentId}/`. Protocolos PDF são gerados com `pdfkit`. Cada service injeta `JourneyService` (exportado pelo `JourneyModule` no Foundation) e chama `refresh(studentId)` ao final de toda mutação que altera dados da journey. `OfficialTheoryExam` e `RenachProcess` validam consistência via `ValidationService` (do sub-plano `validation-and-clinics`).

**Tech Stack:** NestJS 11 + Prisma 7 + PostgreSQL + Jest + Supertest. Dependência nova: `pdfkit` (+ `@types/pdfkit` em dev). Multer já vem com `@nestjs/platform-express`. Endpoints `/api/v1/renach`, `/api/v1/medical-exam`, `/api/v1/psychological-exam`, `/api/v1/theory-exam`, `/api/v1/students/me/theory-course/start`.

**Spec de referência:** `docs/superpowers/specs/2026-05-14-brazilian-license-system-design.md` — Seção 6 (endpoints `/renach`, `/medical-exam`, `/psychological-exam`, `/theory-exam`, `/students/me/theory-course/start`), Seção 5 (justificativas de módulos verticais), Seção 4 (tabelas — já criadas no Foundation), Seção 11 (seeds).

**Critério de pronto:**
- `POST /students/me/theory-course/start` transita `REGISTERED → RENACH_PENDING` (via journey refresh).
- `POST /renach/me/done` com `{renachNumber, biometryDoneAt}` transita `RENACH_PENDING → MEDICAL_PENDING`.
- `POST /medical-exam/me/schedule` cria protocolo, `POST /medical-exam/me/laudo` com upload e `result=APTO` válida transita `MEDICAL_PENDING → PSYCH_PENDING`.
- `POST /psychological-exam/me/laudo` com `result=APTO` transita `PSYCH_PENDING → THEORY_EXAM_PENDING`.
- `POST /theory-exam/me` com `passed=true` transita `THEORY_EXAM_PENDING → AWAITING_LADV_UPLOAD`.
- `GET /medical-exam/me/protocol/pdf` retorna `application/pdf` válido com o `protocolCode`.
- Aluno seed `student-medical@email.com` consegue executar a cadeia completa via e2e.
- `npm test` e `npm run test:e2e` verdes.

---

## File Structure

**Created (27 arquivos):**

- `src/common/uploads/upload-storage.ts` — factory de `diskStorage` para multer (parametrizada por pasta)
- `src/modules/renach-process/renach-process.module.ts`
- `src/modules/renach-process/renach-process.controller.ts`
- `src/modules/renach-process/renach-process.service.ts`
- `src/modules/renach-process/renach-process.service.spec.ts`
- `src/modules/renach-process/dto/schedule-renach.dto.ts`
- `src/modules/renach-process/dto/complete-renach.dto.ts`
- `src/modules/renach-process/dto/renach-process.dto.ts`
- `src/modules/medical-exam/medical-exam.module.ts`
- `src/modules/medical-exam/medical-exam.controller.ts`
- `src/modules/medical-exam/medical-exam.service.ts`
- `src/modules/medical-exam/medical-exam.service.spec.ts`
- `src/modules/medical-exam/dto/schedule-exam.dto.ts`
- `src/modules/medical-exam/dto/upload-laudo.dto.ts`
- `src/modules/medical-exam/dto/medical-exam.dto.ts`
- `src/modules/medical-exam/lib/protocol-pdf.ts`
- `src/modules/medical-exam/lib/protocol-pdf.spec.ts`
- `src/modules/psychological-exam/psychological-exam.module.ts`
- `src/modules/psychological-exam/psychological-exam.controller.ts`
- `src/modules/psychological-exam/psychological-exam.service.ts`
- `src/modules/psychological-exam/psychological-exam.service.spec.ts`
- `src/modules/psychological-exam/dto/schedule-exam.dto.ts`
- `src/modules/psychological-exam/dto/upload-laudo.dto.ts`
- `src/modules/psychological-exam/dto/psychological-exam.dto.ts`
- `src/modules/theory-exam-official/theory-exam.module.ts`
- `src/modules/theory-exam-official/theory-exam.controller.ts`
- `src/modules/theory-exam-official/theory-exam.service.ts`
- `src/modules/theory-exam-official/theory-exam.service.spec.ts`
- `src/modules/theory-exam-official/dto/record-theory-exam.dto.ts`
- `src/modules/theory-exam-official/dto/theory-exam.dto.ts`
- `test/renach-process.e2e-spec.ts`
- `test/medical-exam.e2e-spec.ts`
- `test/psychological-exam.e2e-spec.ts`
- `test/theory-exam.e2e-spec.ts`

**Modified:**

- `src/app.module.ts` — importa os 4 módulos novos
- `src/modules/students/students.controller.ts` — adiciona `POST me/theory-course/start`
- `src/modules/students/students.service.ts` — método `startTheoryCourse(studentId)`
- `src/modules/students/students.module.ts` — importa `JourneyModule`
- `prisma/seed.ts` — adiciona 3 alunos intermediários (`student-psych`, `student-theory`, `student-awaiting-ladv`)
- `package.json` — adiciona `pdfkit` e `@types/pdfkit`
- `CLAUDE.md` — atualiza estrutura de pastas

---

## Task 1: Dependências, helper de storage e estrutura de uploads

**Files:**

- Modify: `package.json`
- Create: `src/common/uploads/upload-storage.ts`

- [ ] **Step 1.1: Instalar dependências**

```bash
npm install pdfkit
npm install --save-dev @types/pdfkit
```

Esperado: pacotes adicionados sem warnings de peer.

- [ ] **Step 1.2: Criar helper de storage para multer**

Centraliza a configuração de `diskStorage` (pasta + filename UUID) para evitar repetição em cada controller.

```typescript
// src/common/uploads/upload-storage.ts
import { diskStorage, StorageEngine } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export function buildUploadStorage(folder: string): StorageEngine {
  return diskStorage({
    destination: (req: Request, _file, cb) => {
      const studentId = (req.user as { id: string } | undefined)?.id ?? 'anonymous';
      const path = `uploads/${folder}/${studentId}`;
      if (!existsSync(path)) mkdirSync(path, { recursive: true });
      cb(null, path);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  });
}

export function uploadFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(
      new BadRequestException(
        `Mimetype ${file.mimetype} not allowed. Accepted: PDF, JPEG, PNG.`,
      ),
      false,
    );
    return;
  }
  cb(null, true);
}
```

- [ ] **Step 1.3: Garantir `.gitignore` ignorando uploads/**

Conferir se `.gitignore` já contém `uploads/`. Se não, adicionar:

```
uploads/
```

- [ ] **Step 1.4: Commit**

```bash
git add package.json package-lock.json src/common/uploads/ .gitignore
git commit -m "feat(uploads): helper de storage multer e dependência pdfkit"
```

---

## Task 2: `RenachProcessService` com TDD

**Files:**

- Create: `src/modules/renach-process/dto/schedule-renach.dto.ts`
- Create: `src/modules/renach-process/dto/complete-renach.dto.ts`
- Create: `src/modules/renach-process/dto/renach-process.dto.ts`
- Create: `src/modules/renach-process/renach-process.service.ts`
- Create: `src/modules/renach-process/renach-process.service.spec.ts`

- [ ] **Step 2.1: DTOs**

```typescript
// src/modules/renach-process/dto/schedule-renach.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ScheduleRenachDto {
  @ApiProperty({ example: 'SP' })
  @IsString()
  @Length(2, 2)
  uf!: string;
}
```

```typescript
// src/modules/renach-process/dto/complete-renach.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, Matches } from 'class-validator';

export class CompleteRenachDto {
  @ApiProperty({ example: 'RNC-2026-00001' })
  @IsString()
  @Matches(/^RNC-\d{4}-\d{5}$/, {
    message: 'renachNumber must match RNC-YYYY-NNNNN',
  })
  renachNumber!: string;

  @ApiProperty({ example: '2026-05-14T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  biometryDoneAt!: Date;
}
```

```typescript
// src/modules/renach-process/dto/renach-process.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class RenachProcessDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false, nullable: true })
  renachNumber!: string | null;

  @ApiProperty()
  ufDetran!: string;

  @ApiProperty({ required: false, nullable: true })
  biometryDoneAt!: Date | null;

  @ApiProperty({ enum: ['PENDING', 'SCHEDULED', 'DONE'] })
  status!: string;

  @ApiProperty({ required: false, nullable: true })
  proofUrl!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
```

- [ ] **Step 2.2: Testes do service (TDD)**

```typescript
// src/modules/renach-process/renach-process.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RenachProcessService } from './renach-process.service';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';

describe('RenachProcessService', () => {
  let service: RenachProcessService;
  let prisma: {
    renachProcess: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
  };
  let journey: { refresh: jest.Mock };

  beforeEach(async () => {
    prisma = {
      renachProcess: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    journey = { refresh: jest.fn().mockResolvedValue({ stage: 'MEDICAL_PENDING' }) };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        RenachProcessService,
        { provide: PrismaService, useValue: prisma },
        { provide: JourneyService, useValue: journey },
      ],
    }).compile();
    service = mod.get(RenachProcessService);
  });

  describe('getMine', () => {
    it('returns the current renach process', async () => {
      prisma.renachProcess.findUnique.mockResolvedValue({
        id: 'r1',
        ufDetran: 'SP',
        status: 'PENDING',
      });
      const r = await service.getMine('stu-1');
      expect(r.id).toBe('r1');
    });

    it('throws NotFoundException when no process exists', async () => {
      prisma.renachProcess.findUnique.mockResolvedValue(null);
      await expect(service.getMine('stu-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getGuide', () => {
    it('returns UF-specific guidance for SP', () => {
      const g = service.getGuide('SP');
      expect(g.uf).toBe('SP');
      expect(g.steps).toEqual(
        expect.arrayContaining([expect.stringMatching(/poupatempo/i)]),
      );
    });

    it('returns generic guidance for an unknown UF', () => {
      const g = service.getGuide('ZZ');
      expect(g.uf).toBe('ZZ');
      expect(g.steps.length).toBeGreaterThan(0);
    });
  });

  describe('schedule', () => {
    it('upserts a PENDING/SCHEDULED process and refreshes journey', async () => {
      prisma.renachProcess.upsert.mockResolvedValue({
        id: 'r1',
        ufDetran: 'SP',
        status: 'SCHEDULED',
      });
      const r = await service.schedule('stu-1', { uf: 'SP' });
      expect(prisma.renachProcess.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 'stu-1' },
          create: expect.objectContaining({
            studentId: 'stu-1',
            ufDetran: 'SP',
            status: 'SCHEDULED',
          }),
          update: expect.objectContaining({
            ufDetran: 'SP',
            status: 'SCHEDULED',
          }),
        }),
      );
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
      expect(r.status).toBe('SCHEDULED');
    });
  });

  describe('complete', () => {
    it('marks DONE with renachNumber and biometryDoneAt, refreshes journey', async () => {
      prisma.renachProcess.findUnique.mockResolvedValue({
        id: 'r1',
        studentId: 'stu-1',
        ufDetran: 'SP',
        status: 'SCHEDULED',
      });
      prisma.renachProcess.update.mockResolvedValue({
        id: 'r1',
        studentId: 'stu-1',
        ufDetran: 'SP',
        renachNumber: 'RNC-2026-00001',
        biometryDoneAt: new Date(),
        status: 'DONE',
      });
      const r = await service.complete('stu-1', {
        renachNumber: 'RNC-2026-00001',
        biometryDoneAt: new Date('2026-05-14T10:00:00Z'),
      });
      expect(prisma.renachProcess.update).toHaveBeenCalledWith({
        where: { studentId: 'stu-1' },
        data: expect.objectContaining({
          renachNumber: 'RNC-2026-00001',
          biometryDoneAt: expect.any(Date),
          status: 'DONE',
        }),
      });
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
      expect(r.status).toBe('DONE');
    });

    it('throws BadRequestException when no process exists yet', async () => {
      prisma.renachProcess.findUnique.mockResolvedValue(null);
      await expect(
        service.complete('stu-1', {
          renachNumber: 'RNC-2026-00001',
          biometryDoneAt: new Date(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2.3: Rodar os testes — devem falhar**

```bash
npm test -- renach-process.service
```

- [ ] **Step 2.4: Implementar `renach-process.service.ts`**

```typescript
// src/modules/renach-process/renach-process.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';
import { ScheduleRenachDto } from './dto/schedule-renach.dto';
import { CompleteRenachDto } from './dto/complete-renach.dto';
import { RenachProcessDto } from './dto/renach-process.dto';

const UF_GUIDES: Record<string, { steps: string[] }> = {
  SP: {
    steps: [
      'Acesse o Poupatempo Digital (https://www.poupatempo.sp.gov.br)',
      'Faça a abertura do processo de 1ª habilitação',
      'Agende a biometria no posto Poupatempo mais próximo',
      'Compareça com RG, CPF e comprovante de residência',
    ],
  },
  RJ: {
    steps: [
      'Acesse o portal DETRAN.RJ (https://www.detran.rj.gov.br)',
      'Inicie o processo de Permissão para Dirigir (PPD)',
      'Agende a coleta biométrica em uma unidade DETRAN',
      'Leve documentação de identidade e comprovante de residência',
    ],
  },
  MG: {
    steps: [
      'Acesse o portal do DETRAN.MG',
      'Solicite a abertura do processo de Primeira Habilitação',
      'Aguarde notificação da unidade onde fará a biometria',
      'Compareça no horário agendado com seus documentos',
    ],
  },
};

@Injectable()
export class RenachProcessService {
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
        'Acesse o portal oficial do DETRAN da sua UF',
        'Abra o processo de 1ª habilitação informando RG e CPF',
        'Agende a biometria no posto mais próximo',
        'Compareça com a documentação solicitada pelo DETRAN local',
      ],
    };
  }

  async getMine(studentId: string): Promise<RenachProcessDto> {
    const r = await this.prisma.renachProcess.findUnique({
      where: { studentId },
    });
    if (!r) throw new NotFoundException('RENACH process not found');
    return r as RenachProcessDto;
  }

  async schedule(
    studentId: string,
    dto: ScheduleRenachDto,
  ): Promise<RenachProcessDto> {
    const r = await this.prisma.renachProcess.upsert({
      where: { studentId },
      create: {
        studentId,
        ufDetran: dto.uf.toUpperCase(),
        status: 'SCHEDULED',
      },
      update: {
        ufDetran: dto.uf.toUpperCase(),
        status: 'SCHEDULED',
      },
    });
    await this.journey.refresh(studentId);
    return r as RenachProcessDto;
  }

  async complete(
    studentId: string,
    dto: CompleteRenachDto,
    proofUrl?: string,
  ): Promise<RenachProcessDto> {
    const existing = await this.prisma.renachProcess.findUnique({
      where: { studentId },
    });
    if (!existing) {
      throw new BadRequestException(
        'No RENACH process to complete — call /renach/me/schedule first',
      );
    }
    const r = await this.prisma.renachProcess.update({
      where: { studentId },
      data: {
        renachNumber: dto.renachNumber,
        biometryDoneAt: dto.biometryDoneAt,
        status: 'DONE',
        ...(proofUrl ? { proofUrl } : {}),
      },
    });
    await this.journey.refresh(studentId);
    return r as RenachProcessDto;
  }
}
```

- [ ] **Step 2.5: Rodar os testes — devem passar**

```bash
npm test -- renach-process.service
```

Esperado: `PASS — Tests: 7 passed`.

- [ ] **Step 2.6: Commit**

```bash
git add src/modules/renach-process/
git commit -m "feat(renach-process): service com guide por UF, schedule e complete + journey refresh"
```

---

## Task 3: `RenachProcessController` + module + e2e

**Files:**

- Create: `src/modules/renach-process/renach-process.controller.ts`
- Create: `src/modules/renach-process/renach-process.module.ts`
- Create: `test/renach-process.e2e-spec.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 3.1: Controller**

```typescript
// src/modules/renach-process/renach-process.controller.ts
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
import { RenachProcessService } from './renach-process.service';
import { ScheduleRenachDto } from './dto/schedule-renach.dto';
import { CompleteRenachDto } from './dto/complete-renach.dto';
import { RenachProcessDto } from './dto/renach-process.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildUploadStorage,
  MAX_UPLOAD_BYTES,
  uploadFileFilter,
} from '../../common/uploads/upload-storage';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('renach-process')
@ApiBearerAuth()
@Controller('renach')
@UseGuards(JwtAuthGuard)
export class RenachProcessController {
  constructor(private readonly service: RenachProcessService) {}

  @Get('guide')
  @ApiOkResponse()
  guide(@Query('uf') uf: string) {
    if (!uf) {
      throw new BadRequestException('Query param "uf" is required');
    }
    return this.service.getGuide(uf);
  }

  @Get('me')
  @ApiOkResponse({ type: RenachProcessDto })
  getMine(@Req() req: RequestWithUser): Promise<RenachProcessDto> {
    return this.service.getMine(req.user.id);
  }

  @Post('me/schedule')
  @ApiOkResponse({ type: RenachProcessDto })
  schedule(
    @Req() req: RequestWithUser,
    @Body() dto: ScheduleRenachDto,
  ): Promise<RenachProcessDto> {
    return this.service.schedule(req.user.id, dto);
  }

  @Post('me/done')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOkResponse({ type: RenachProcessDto })
  @UseInterceptors(
    FileInterceptor('proofFile', {
      storage: buildUploadStorage('renach'),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  complete(
    @Req() req: RequestWithUser,
    @Body() dto: CompleteRenachDto,
    @UploadedFile() proofFile?: Express.Multer.File,
  ): Promise<RenachProcessDto> {
    return this.service.complete(req.user.id, dto, proofFile?.path);
  }
}
```

- [ ] **Step 3.2: Module**

```typescript
// src/modules/renach-process/renach-process.module.ts
import { Module } from '@nestjs/common';
import { RenachProcessController } from './renach-process.controller';
import { RenachProcessService } from './renach-process.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JourneyModule, AuthModule],
  controllers: [RenachProcessController],
  providers: [RenachProcessService],
})
export class RenachProcessModule {}
```

- [ ] **Step 3.3: Importar no `AppModule`**

```typescript
import { RenachProcessModule } from './modules/renach-process/renach-process.module';

// imports[]:
    RenachProcessModule,
```

- [ ] **Step 3.4: E2E**

```typescript
// test/renach-process.e2e-spec.ts
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

describe('RenachProcess (e2e)', () => {
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

  it('GET /renach/guide?uf=SP returns Poupatempo steps', async () => {
    const token = await login(app, 'student-renach@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/renach/guide?uf=SP')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.uf).toBe('SP');
    expect(res.body.data.steps.some((s: string) => /poupatempo/i.test(s))).toBe(
      true,
    );
  });

  it('POST /renach/me/schedule then /me/done transitions RENACH_PENDING → MEDICAL_PENDING', async () => {
    const token = await login(app, 'student-renach@email.com');

    await request(app.getHttpServer())
      .post('/api/v1/renach/me/schedule')
      .set('Authorization', `Bearer ${token}`)
      .send({ uf: 'SP' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/renach/me/done')
      .set('Authorization', `Bearer ${token}`)
      .send({
        renachNumber: 'RNC-2026-99999',
        biometryDoneAt: new Date().toISOString(),
      })
      .expect(201);

    const journey = await request(app.getHttpServer())
      .get('/api/v1/journey/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(journey.body.data.stage).toBe('MEDICAL_PENDING');
  });

  it('POST /renach/me/done with malformed renachNumber returns 400', async () => {
    const token = await login(app, 'student-renach@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/renach/me/done')
      .set('Authorization', `Bearer ${token}`)
      .send({
        renachNumber: 'XXX',
        biometryDoneAt: new Date().toISOString(),
      })
      .expect(400);
  });
});
```

- [ ] **Step 3.5: Rodar build e e2e**

```bash
npm run build && npm run test:e2e -- renach-process
```

Esperado: build limpo + 3 testes passando.

- [ ] **Step 3.6: Commit**

```bash
git add src/modules/renach-process/renach-process.controller.ts src/modules/renach-process/renach-process.module.ts src/app.module.ts test/renach-process.e2e-spec.ts
git commit -m "feat(renach-process): controller + module + e2e em /api/v1/renach"
```

---

## Task 4: Gerador de protocolo PDF (compartilhado) com TDD

Como medical-exam e psychological-exam geram protocolos similares, isolamos a função pura em `medical-exam/lib/`. O psychological-exam vai importar de lá (mas pode usar uma chamada genérica).

**Files:**

- Create: `src/modules/medical-exam/lib/protocol-pdf.ts`
- Create: `src/modules/medical-exam/lib/protocol-pdf.spec.ts`

- [ ] **Step 4.1: Testes da função de PDF (TDD)**

```typescript
// src/modules/medical-exam/lib/protocol-pdf.spec.ts
import { buildProtocolPdf, ProtocolPdfInput } from './protocol-pdf';

describe('buildProtocolPdf', () => {
  it('returns a Buffer with PDF magic bytes', async () => {
    const input: ProtocolPdfInput = {
      protocolCode: 'MED-2026-12345',
      studentName: 'João Silva',
      examType: 'Exame médico — 1ª CNH',
      clinicName: 'Clínica Avenida Paulista',
      clinicAddress: 'Av. Paulista, 1000',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
    };
    const buf = await buildProtocolPdf(input);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(500);
  });

  it('handles missing clinic info gracefully', async () => {
    const input: ProtocolPdfInput = {
      protocolCode: 'MED-2026-00001',
      studentName: 'Aluno X',
      examType: 'Exame médico',
      clinicName: null,
      clinicAddress: null,
      scheduledAt: null,
    };
    const buf = await buildProtocolPdf(input);
    expect(buf.length).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 4.2: Rodar os testes — devem falhar**

```bash
npm test -- protocol-pdf
```

- [ ] **Step 4.3: Implementar `protocol-pdf.ts`**

```typescript
// src/modules/medical-exam/lib/protocol-pdf.ts
import PDFDocument from 'pdfkit';

export interface ProtocolPdfInput {
  protocolCode: string;
  studentName: string;
  examType: string;
  clinicName: string | null;
  clinicAddress: string | null;
  scheduledAt: Date | null;
}

export function buildProtocolPdf(input: ProtocolPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Protocolo de Agendamento', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Tipo: ${input.examType}`);
    doc.text(`Protocolo: ${input.protocolCode}`);
    doc.text(`Aluno: ${input.studentName}`);
    doc.moveDown();

    if (input.clinicName) {
      doc.text(`Clínica: ${input.clinicName}`);
    }
    if (input.clinicAddress) {
      doc.text(`Endereço: ${input.clinicAddress}`);
    }
    if (input.scheduledAt) {
      doc.text(`Data agendada: ${input.scheduledAt.toLocaleString('pt-BR')}`);
    }
    doc.moveDown();
    doc.fontSize(10).text(
      'Apresente este protocolo na clínica no dia do exame. ' +
        'Velo — Resolução CONTRAN 1.020/2025.',
      { align: 'left' },
    );
    doc.end();
  });
}
```

- [ ] **Step 4.4: Rodar os testes — devem passar**

```bash
npm test -- protocol-pdf
```

- [ ] **Step 4.5: Commit**

```bash
git add src/modules/medical-exam/lib/protocol-pdf.ts src/modules/medical-exam/lib/protocol-pdf.spec.ts
git commit -m "feat(medical-exam): gerador de protocolo PDF com pdfkit + testes"
```

---

## Task 5: `MedicalExamService` com TDD

**Files:**

- Create: `src/modules/medical-exam/dto/schedule-exam.dto.ts`
- Create: `src/modules/medical-exam/dto/upload-laudo.dto.ts`
- Create: `src/modules/medical-exam/dto/medical-exam.dto.ts`
- Create: `src/modules/medical-exam/medical-exam.service.ts`
- Create: `src/modules/medical-exam/medical-exam.service.spec.ts`

- [ ] **Step 5.1: DTOs**

```typescript
// src/modules/medical-exam/dto/schedule-exam.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class ScheduleMedicalExamDto {
  @ApiProperty()
  @IsString()
  clinicId!: string;

  @ApiProperty({ example: '2026-06-01T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;
}
```

```typescript
// src/modules/medical-exam/dto/upload-laudo.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString } from 'class-validator';

export class UploadMedicalLaudoDto {
  @ApiProperty({ enum: ['APTO', 'INAPTO', 'APTO_COM_RESTRICOES'] })
  @IsIn(['APTO', 'INAPTO', 'APTO_COM_RESTRICOES'])
  result!: 'APTO' | 'INAPTO' | 'APTO_COM_RESTRICOES';

  @ApiProperty({ example: '2027-06-01T00:00:00Z' })
  @Type(() => Date)
  @IsDate()
  validUntil!: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  restrictions?: string;
}
```

```typescript
// src/modules/medical-exam/dto/medical-exam.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class MedicalExamDto {
  @ApiProperty()
  id!: string;
  @ApiProperty({ required: false, nullable: true })
  clinicId!: string | null;
  @ApiProperty()
  protocolCode!: string;
  @ApiProperty({ required: false, nullable: true })
  scheduledAt!: Date | null;
  @ApiProperty({ required: false, nullable: true })
  performedAt!: Date | null;
  @ApiProperty({ required: false, nullable: true })
  result!: string | null;
  @ApiProperty({ required: false, nullable: true })
  restrictions!: string | null;
  @ApiProperty({ required: false, nullable: true })
  validUntil!: Date | null;
  @ApiProperty({ required: false, nullable: true })
  laudoUrl!: string | null;
  @ApiProperty()
  status!: string;
  @ApiProperty({ required: false, nullable: true })
  rejectionReason!: string | null;
}
```

- [ ] **Step 5.2: Testes (TDD)**

```typescript
// src/modules/medical-exam/medical-exam.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MedicalExamService } from './medical-exam.service';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';

describe('MedicalExamService', () => {
  let service: MedicalExamService;
  let prisma: {
    medicalExam: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    clinic: { findUnique: jest.Mock };
    student: { findUnique: jest.Mock };
  };
  let journey: { refresh: jest.Mock };

  beforeEach(async () => {
    prisma = {
      medicalExam: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      clinic: { findUnique: jest.fn() },
      student: { findUnique: jest.fn() },
    };
    journey = { refresh: jest.fn().mockResolvedValue({ stage: 'PSYCH_PENDING' }) };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalExamService,
        { provide: PrismaService, useValue: prisma },
        { provide: JourneyService, useValue: journey },
      ],
    }).compile();
    service = mod.get(MedicalExamService);
  });

  describe('schedule', () => {
    it('rejects when clinic is not MEDICAL or inactive', async () => {
      prisma.clinic.findUnique.mockResolvedValue({
        id: 'c1',
        type: 'PSYCHOLOGICAL',
        isActive: true,
      });
      await expect(
        service.schedule('stu-1', { clinicId: 'c1', scheduledAt: new Date() }),
      ).rejects.toThrow(BadRequestException);
    });

    it('generates a protocolCode and upserts SCHEDULED', async () => {
      prisma.clinic.findUnique.mockResolvedValue({
        id: 'c1',
        type: 'MEDICAL',
        isActive: true,
      });
      prisma.medicalExam.upsert.mockImplementation(({ create, update }) =>
        Promise.resolve({ id: 'e1', ...create, ...update }),
      );
      const r = await service.schedule('stu-1', {
        clinicId: 'c1',
        scheduledAt: new Date('2026-06-01T10:00:00Z'),
      });
      expect(r.protocolCode).toMatch(/^MED-\d{4}-[A-Z0-9]{6}$/);
      expect(prisma.medicalExam.upsert).toHaveBeenCalled();
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
    });
  });

  describe('uploadLaudo', () => {
    it('updates with APTO + validUntil and refreshes journey', async () => {
      prisma.medicalExam.findUnique.mockResolvedValue({
        id: 'e1',
        studentId: 'stu-1',
        protocolCode: 'MED-2026-AAA111',
        status: 'SCHEDULED',
      });
      prisma.medicalExam.update.mockResolvedValue({
        id: 'e1',
        studentId: 'stu-1',
        protocolCode: 'MED-2026-AAA111',
        status: 'RESULT_UPLOADED',
        result: 'APTO',
        validUntil: new Date('2027-06-01'),
      });
      const r = await service.uploadLaudo(
        'stu-1',
        {
          result: 'APTO',
          validUntil: new Date('2027-06-01'),
        },
        '/uploads/medical/stu-1/laudo.pdf',
      );
      expect(prisma.medicalExam.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: expect.objectContaining({
          status: 'RESULT_UPLOADED',
          result: 'APTO',
          laudoUrl: '/uploads/medical/stu-1/laudo.pdf',
          performedAt: expect.any(Date),
        }),
      });
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
      expect(r.status).toBe('RESULT_UPLOADED');
    });

    it('rejects when validUntil is in the past', async () => {
      prisma.medicalExam.findUnique.mockResolvedValue({
        id: 'e1',
        studentId: 'stu-1',
        status: 'SCHEDULED',
      });
      await expect(
        service.uploadLaudo(
          'stu-1',
          {
            result: 'APTO',
            validUntil: new Date('2020-01-01'),
          },
          '/uploads/medical/stu-1/laudo.pdf',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when no exam to upload laudo to', async () => {
      prisma.medicalExam.findUnique.mockResolvedValue(null);
      await expect(
        service.uploadLaudo(
          'stu-1',
          { result: 'APTO', validUntil: new Date('2027-06-01') },
          '/path',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('buildProtocolPdfBuffer', () => {
    it('throws NotFoundException when no exam exists', async () => {
      prisma.medicalExam.findUnique.mockResolvedValue(null);
      await expect(service.buildProtocolPdfBuffer('stu-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns a Buffer with PDF magic bytes', async () => {
      prisma.medicalExam.findUnique.mockResolvedValue({
        id: 'e1',
        protocolCode: 'MED-2026-AAA111',
        scheduledAt: new Date('2026-06-01T10:00:00Z'),
        clinic: { name: 'Clínica X', address: 'Rua A, 1' },
      });
      prisma.student.findUnique.mockResolvedValue({ name: 'João' });

      const buf = await service.buildProtocolPdfBuffer('stu-1');
      expect(buf.slice(0, 4).toString()).toBe('%PDF');
    });
  });
});
```

- [ ] **Step 5.3: Rodar os testes — devem falhar**

```bash
npm test -- medical-exam.service
```

- [ ] **Step 5.4: Implementar `medical-exam.service.ts`**

```typescript
// src/modules/medical-exam/medical-exam.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';
import { ScheduleMedicalExamDto } from './dto/schedule-exam.dto';
import { UploadMedicalLaudoDto } from './dto/upload-laudo.dto';
import { MedicalExamDto } from './dto/medical-exam.dto';
import { buildProtocolPdf } from './lib/protocol-pdf';

function newProtocolCode(prefix: string): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `${prefix}-${year}-${suffix}`;
}

@Injectable()
export class MedicalExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journey: JourneyService,
  ) {}

  async getMine(studentId: string): Promise<MedicalExamDto | null> {
    return (await this.prisma.medicalExam.findUnique({
      where: { studentId },
    })) as MedicalExamDto | null;
  }

  async schedule(
    studentId: string,
    dto: ScheduleMedicalExamDto,
  ): Promise<MedicalExamDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });
    if (!clinic || !clinic.isActive || clinic.type !== 'MEDICAL') {
      throw new BadRequestException(
        'Selected clinic is not an active MEDICAL clinic',
      );
    }
    const protocolCode = newProtocolCode('MED');
    const result = await this.prisma.medicalExam.upsert({
      where: { studentId },
      create: {
        studentId,
        clinicId: dto.clinicId,
        scheduledAt: dto.scheduledAt,
        protocolCode,
        status: 'SCHEDULED',
      },
      update: {
        clinicId: dto.clinicId,
        scheduledAt: dto.scheduledAt,
        status: 'SCHEDULED',
      },
    });
    await this.journey.refresh(studentId);
    return result as MedicalExamDto;
  }

  async uploadLaudo(
    studentId: string,
    dto: UploadMedicalLaudoDto,
    laudoUrl: string,
  ): Promise<MedicalExamDto> {
    if (dto.validUntil <= new Date()) {
      throw new BadRequestException('validUntil must be in the future');
    }
    const existing = await this.prisma.medicalExam.findUnique({
      where: { studentId },
    });
    if (!existing) {
      throw new NotFoundException(
        'No medical exam scheduled — call /medical-exam/me/schedule first',
      );
    }
    const updated = await this.prisma.medicalExam.update({
      where: { id: existing.id },
      data: {
        result: dto.result,
        validUntil: dto.validUntil,
        restrictions: dto.restrictions ?? null,
        laudoUrl,
        status: 'RESULT_UPLOADED',
        performedAt: new Date(),
      },
    });
    await this.journey.refresh(studentId);
    return updated as MedicalExamDto;
  }

  async buildProtocolPdfBuffer(studentId: string): Promise<Buffer> {
    const exam = await this.prisma.medicalExam.findUnique({
      where: { studentId },
      include: { clinic: true },
    });
    if (!exam) {
      throw new NotFoundException('No medical exam to print protocol for');
    }
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    return buildProtocolPdf({
      protocolCode: exam.protocolCode,
      studentName: student?.name ?? 'Aluno',
      examType: 'Exame médico — 1ª CNH',
      clinicName: exam.clinic?.name ?? null,
      clinicAddress: exam.clinic?.address ?? null,
      scheduledAt: exam.scheduledAt ?? null,
    });
  }
}
```

- [ ] **Step 5.5: Rodar os testes — devem passar**

```bash
npm test -- medical-exam.service
```

Esperado: `PASS — Tests: 7 passed`.

- [ ] **Step 5.6: Commit**

```bash
git add src/modules/medical-exam/dto/ src/modules/medical-exam/medical-exam.service.ts src/modules/medical-exam/medical-exam.service.spec.ts
git commit -m "feat(medical-exam): service com schedule, uploadLaudo, protocol PDF e journey refresh"
```

---

## Task 6: `MedicalExamController` + module + e2e

**Files:**

- Create: `src/modules/medical-exam/medical-exam.controller.ts`
- Create: `src/modules/medical-exam/medical-exam.module.ts`
- Create: `test/medical-exam.e2e-spec.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 6.1: Controller**

```typescript
// src/modules/medical-exam/medical-exam.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MedicalExamService } from './medical-exam.service';
import { ScheduleMedicalExamDto } from './dto/schedule-exam.dto';
import { UploadMedicalLaudoDto } from './dto/upload-laudo.dto';
import { MedicalExamDto } from './dto/medical-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildUploadStorage,
  MAX_UPLOAD_BYTES,
  uploadFileFilter,
} from '../../common/uploads/upload-storage';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('medical-exam')
@ApiBearerAuth()
@Controller('medical-exam')
@UseGuards(JwtAuthGuard)
export class MedicalExamController {
  constructor(private readonly service: MedicalExamService) {}

  @Get('me')
  @ApiOkResponse({ type: MedicalExamDto })
  async getMine(@Req() req: RequestWithUser): Promise<MedicalExamDto | null> {
    return this.service.getMine(req.user.id);
  }

  @Post('me/schedule')
  @ApiOkResponse({ type: MedicalExamDto })
  schedule(
    @Req() req: RequestWithUser,
    @Body() dto: ScheduleMedicalExamDto,
  ): Promise<MedicalExamDto> {
    return this.service.schedule(req.user.id, dto);
  }

  @Post('me/laudo')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: MedicalExamDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildUploadStorage('medical'),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  uploadLaudo(
    @Req() req: RequestWithUser,
    @Body() dto: UploadMedicalLaudoDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MedicalExamDto> {
    if (!file) {
      throw new BadRequestException('Laudo file is required');
    }
    return this.service.uploadLaudo(req.user.id, dto, file.path);
  }

  @Get('me/protocol/pdf')
  async downloadProtocol(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const buf = await this.service.buildProtocolPdfBuffer(req.user.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="protocolo-medico.pdf"',
    );
    res.end(buf);
  }
}
```

- [ ] **Step 6.2: Module**

```typescript
// src/modules/medical-exam/medical-exam.module.ts
import { Module } from '@nestjs/common';
import { MedicalExamController } from './medical-exam.controller';
import { MedicalExamService } from './medical-exam.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JourneyModule, AuthModule],
  controllers: [MedicalExamController],
  providers: [MedicalExamService],
  exports: [MedicalExamService],
})
export class MedicalExamModule {}
```

- [ ] **Step 6.3: Importar no `AppModule`**

```typescript
import { MedicalExamModule } from './modules/medical-exam/medical-exam.module';

// imports[]:
    MedicalExamModule,
```

- [ ] **Step 6.4: E2E**

```typescript
// test/medical-exam.e2e-spec.ts
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

describe('MedicalExam (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clinicId: string;

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
    const clinic = await prisma.clinic.findFirst({
      where: { type: 'MEDICAL', isActive: true },
    });
    if (!clinic) {
      throw new Error(
        'No MEDICAL clinic seeded — run prisma db seed before this e2e',
      );
    }
    clinicId = clinic.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /medical-exam/me/schedule + /me/laudo transitions MEDICAL_PENDING → PSYCH_PENDING', async () => {
    const token = await login(app, 'student-medical@email.com');

    await request(app.getHttpServer())
      .post('/api/v1/medical-exam/me/schedule')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clinicId,
        scheduledAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/medical-exam/me/laudo')
      .set('Authorization', `Bearer ${token}`)
      .field('result', 'APTO')
      .field(
        'validUntil',
        new Date(Date.now() + 365 * 86400000).toISOString(),
      )
      .attach('file', Buffer.from('%PDF-fake'), {
        filename: 'laudo.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const journey = await request(app.getHttpServer())
      .get('/api/v1/journey/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(journey.body.data.stage).toBe('PSYCH_PENDING');
  });

  it('GET /medical-exam/me/protocol/pdf returns application/pdf', async () => {
    const token = await login(app, 'student-medical@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/medical-exam/me/protocol/pdf')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });

  it('POST /medical-exam/me/schedule with PSYCHOLOGICAL clinic returns 400', async () => {
    const token = await login(app, 'student-medical@email.com');
    const psyClinic = await prisma.clinic.findFirst({
      where: { type: 'PSYCHOLOGICAL', isActive: true },
    });
    await request(app.getHttpServer())
      .post('/api/v1/medical-exam/me/schedule')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clinicId: psyClinic!.id,
        scheduledAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .expect(400);
  });
});
```

- [ ] **Step 6.5: Rodar build + e2e**

```bash
npm run build && npm run test:e2e -- medical-exam
```

Esperado: 3 testes passando.

- [ ] **Step 6.6: Commit**

```bash
git add src/modules/medical-exam/medical-exam.controller.ts src/modules/medical-exam/medical-exam.module.ts src/app.module.ts test/medical-exam.e2e-spec.ts
git commit -m "feat(medical-exam): controller + module + e2e em /api/v1/medical-exam"
```

---

## Task 7: `PsychologicalExamService` com TDD

**Files:**

- Create: `src/modules/psychological-exam/dto/schedule-exam.dto.ts`
- Create: `src/modules/psychological-exam/dto/upload-laudo.dto.ts`
- Create: `src/modules/psychological-exam/dto/psychological-exam.dto.ts`
- Create: `src/modules/psychological-exam/psychological-exam.service.ts`
- Create: `src/modules/psychological-exam/psychological-exam.service.spec.ts`

- [ ] **Step 7.1: DTOs (idênticos em forma ao medical, prefixo psychological)**

```typescript
// src/modules/psychological-exam/dto/schedule-exam.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class SchedulePsychologicalExamDto {
  @ApiProperty()
  @IsString()
  clinicId!: string;

  @ApiProperty({ example: '2026-06-01T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;
}
```

```typescript
// src/modules/psychological-exam/dto/upload-laudo.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString } from 'class-validator';

export class UploadPsychologicalLaudoDto {
  @ApiProperty({ enum: ['APTO', 'INAPTO', 'APTO_COM_RESTRICOES'] })
  @IsIn(['APTO', 'INAPTO', 'APTO_COM_RESTRICOES'])
  result!: 'APTO' | 'INAPTO' | 'APTO_COM_RESTRICOES';

  @ApiProperty({ example: '2027-06-01T00:00:00Z' })
  @Type(() => Date)
  @IsDate()
  validUntil!: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  restrictions?: string;
}
```

```typescript
// src/modules/psychological-exam/dto/psychological-exam.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PsychologicalExamDto {
  @ApiProperty()
  id!: string;
  @ApiProperty({ required: false, nullable: true })
  clinicId!: string | null;
  @ApiProperty()
  protocolCode!: string;
  @ApiProperty({ required: false, nullable: true })
  scheduledAt!: Date | null;
  @ApiProperty({ required: false, nullable: true })
  performedAt!: Date | null;
  @ApiProperty({ required: false, nullable: true })
  result!: string | null;
  @ApiProperty({ required: false, nullable: true })
  restrictions!: string | null;
  @ApiProperty({ required: false, nullable: true })
  validUntil!: Date | null;
  @ApiProperty({ required: false, nullable: true })
  laudoUrl!: string | null;
  @ApiProperty()
  status!: string;
  @ApiProperty({ required: false, nullable: true })
  rejectionReason!: string | null;
}
```

- [ ] **Step 7.2: Testes (TDD)**

```typescript
// src/modules/psychological-exam/psychological-exam.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PsychologicalExamService } from './psychological-exam.service';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';

describe('PsychologicalExamService', () => {
  let service: PsychologicalExamService;
  let prisma: {
    psychologicalExam: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    clinic: { findUnique: jest.Mock };
    student: { findUnique: jest.Mock };
  };
  let journey: { refresh: jest.Mock };

  beforeEach(async () => {
    prisma = {
      psychologicalExam: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      clinic: { findUnique: jest.fn() },
      student: { findUnique: jest.fn() },
    };
    journey = {
      refresh: jest.fn().mockResolvedValue({ stage: 'THEORY_EXAM_PENDING' }),
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        PsychologicalExamService,
        { provide: PrismaService, useValue: prisma },
        { provide: JourneyService, useValue: journey },
      ],
    }).compile();
    service = mod.get(PsychologicalExamService);
  });

  it('schedule rejects when clinic is MEDICAL', async () => {
    prisma.clinic.findUnique.mockResolvedValue({
      id: 'c1',
      type: 'MEDICAL',
      isActive: true,
    });
    await expect(
      service.schedule('stu-1', { clinicId: 'c1', scheduledAt: new Date() }),
    ).rejects.toThrow(BadRequestException);
  });

  it('schedule generates PSY-* protocol code', async () => {
    prisma.clinic.findUnique.mockResolvedValue({
      id: 'c1',
      type: 'PSYCHOLOGICAL',
      isActive: true,
    });
    prisma.psychologicalExam.upsert.mockImplementation(({ create, update }) =>
      Promise.resolve({ id: 'e1', ...create, ...update }),
    );
    const r = await service.schedule('stu-1', {
      clinicId: 'c1',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
    });
    expect(r.protocolCode).toMatch(/^PSY-\d{4}-[A-Z0-9]{6}$/);
    expect(journey.refresh).toHaveBeenCalledWith('stu-1');
  });

  it('uploadLaudo with APTO refreshes journey to THEORY_EXAM_PENDING', async () => {
    prisma.psychologicalExam.findUnique.mockResolvedValue({
      id: 'e1',
      studentId: 'stu-1',
      status: 'SCHEDULED',
    });
    prisma.psychologicalExam.update.mockResolvedValue({
      id: 'e1',
      status: 'RESULT_UPLOADED',
      result: 'APTO',
    });
    await service.uploadLaudo(
      'stu-1',
      {
        result: 'APTO',
        validUntil: new Date(Date.now() + 365 * 86400000),
      },
      '/uploads/psychological/stu-1/laudo.pdf',
    );
    expect(journey.refresh).toHaveBeenCalledWith('stu-1');
  });

  it('uploadLaudo rejects expired validUntil', async () => {
    prisma.psychologicalExam.findUnique.mockResolvedValue({
      id: 'e1',
      studentId: 'stu-1',
      status: 'SCHEDULED',
    });
    await expect(
      service.uploadLaudo(
        'stu-1',
        { result: 'APTO', validUntil: new Date('2020-01-01') },
        '/p',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('uploadLaudo throws when no exam exists', async () => {
    prisma.psychologicalExam.findUnique.mockResolvedValue(null);
    await expect(
      service.uploadLaudo(
        'stu-1',
        { result: 'APTO', validUntil: new Date(Date.now() + 86400000) },
        '/p',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('buildProtocolPdfBuffer returns PDF magic bytes', async () => {
    prisma.psychologicalExam.findUnique.mockResolvedValue({
      id: 'e1',
      protocolCode: 'PSY-2026-AAA111',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      clinic: { name: 'Psico X', address: 'Rua A, 1' },
    });
    prisma.student.findUnique.mockResolvedValue({ name: 'João' });
    const buf = await service.buildProtocolPdfBuffer('stu-1');
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });
});
```

- [ ] **Step 7.3: Rodar os testes — devem falhar**

```bash
npm test -- psychological-exam.service
```

- [ ] **Step 7.4: Implementar `psychological-exam.service.ts`**

```typescript
// src/modules/psychological-exam/psychological-exam.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';
import { SchedulePsychologicalExamDto } from './dto/schedule-exam.dto';
import { UploadPsychologicalLaudoDto } from './dto/upload-laudo.dto';
import { PsychologicalExamDto } from './dto/psychological-exam.dto';
import { buildProtocolPdf } from '../medical-exam/lib/protocol-pdf';

function newProtocolCode(): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `PSY-${year}-${suffix}`;
}

@Injectable()
export class PsychologicalExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journey: JourneyService,
  ) {}

  async getMine(studentId: string): Promise<PsychologicalExamDto | null> {
    return (await this.prisma.psychologicalExam.findUnique({
      where: { studentId },
    })) as PsychologicalExamDto | null;
  }

  async schedule(
    studentId: string,
    dto: SchedulePsychologicalExamDto,
  ): Promise<PsychologicalExamDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });
    if (!clinic || !clinic.isActive || clinic.type !== 'PSYCHOLOGICAL') {
      throw new BadRequestException(
        'Selected clinic is not an active PSYCHOLOGICAL clinic',
      );
    }
    const protocolCode = newProtocolCode();
    const result = await this.prisma.psychologicalExam.upsert({
      where: { studentId },
      create: {
        studentId,
        clinicId: dto.clinicId,
        scheduledAt: dto.scheduledAt,
        protocolCode,
        status: 'SCHEDULED',
      },
      update: {
        clinicId: dto.clinicId,
        scheduledAt: dto.scheduledAt,
        status: 'SCHEDULED',
      },
    });
    await this.journey.refresh(studentId);
    return result as PsychologicalExamDto;
  }

  async uploadLaudo(
    studentId: string,
    dto: UploadPsychologicalLaudoDto,
    laudoUrl: string,
  ): Promise<PsychologicalExamDto> {
    if (dto.validUntil <= new Date()) {
      throw new BadRequestException('validUntil must be in the future');
    }
    const existing = await this.prisma.psychologicalExam.findUnique({
      where: { studentId },
    });
    if (!existing) {
      throw new NotFoundException(
        'No psychological exam scheduled — call /psychological-exam/me/schedule first',
      );
    }
    const updated = await this.prisma.psychologicalExam.update({
      where: { id: existing.id },
      data: {
        result: dto.result,
        validUntil: dto.validUntil,
        restrictions: dto.restrictions ?? null,
        laudoUrl,
        status: 'RESULT_UPLOADED',
        performedAt: new Date(),
      },
    });
    await this.journey.refresh(studentId);
    return updated as PsychologicalExamDto;
  }

  async buildProtocolPdfBuffer(studentId: string): Promise<Buffer> {
    const exam = await this.prisma.psychologicalExam.findUnique({
      where: { studentId },
      include: { clinic: true },
    });
    if (!exam) {
      throw new NotFoundException(
        'No psychological exam to print protocol for',
      );
    }
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    return buildProtocolPdf({
      protocolCode: exam.protocolCode,
      studentName: student?.name ?? 'Aluno',
      examType: 'Avaliação psicológica — 1ª CNH',
      clinicName: exam.clinic?.name ?? null,
      clinicAddress: exam.clinic?.address ?? null,
      scheduledAt: exam.scheduledAt ?? null,
    });
  }
}
```

- [ ] **Step 7.5: Rodar os testes — devem passar**

```bash
npm test -- psychological-exam.service
```

Esperado: `PASS — Tests: 6 passed`.

- [ ] **Step 7.6: Commit**

```bash
git add src/modules/psychological-exam/dto/ src/modules/psychological-exam/psychological-exam.service.ts src/modules/psychological-exam/psychological-exam.service.spec.ts
git commit -m "feat(psychological-exam): service espelhando medical-exam com PSY-* protocol"
```

---

## Task 8: `PsychologicalExamController` + module + e2e

**Files:**

- Create: `src/modules/psychological-exam/psychological-exam.controller.ts`
- Create: `src/modules/psychological-exam/psychological-exam.module.ts`
- Create: `test/psychological-exam.e2e-spec.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 8.1: Controller**

```typescript
// src/modules/psychological-exam/psychological-exam.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PsychologicalExamService } from './psychological-exam.service';
import { SchedulePsychologicalExamDto } from './dto/schedule-exam.dto';
import { UploadPsychologicalLaudoDto } from './dto/upload-laudo.dto';
import { PsychologicalExamDto } from './dto/psychological-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildUploadStorage,
  MAX_UPLOAD_BYTES,
  uploadFileFilter,
} from '../../common/uploads/upload-storage';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('psychological-exam')
@ApiBearerAuth()
@Controller('psychological-exam')
@UseGuards(JwtAuthGuard)
export class PsychologicalExamController {
  constructor(private readonly service: PsychologicalExamService) {}

  @Get('me')
  @ApiOkResponse({ type: PsychologicalExamDto })
  async getMine(
    @Req() req: RequestWithUser,
  ): Promise<PsychologicalExamDto | null> {
    return this.service.getMine(req.user.id);
  }

  @Post('me/schedule')
  @ApiOkResponse({ type: PsychologicalExamDto })
  schedule(
    @Req() req: RequestWithUser,
    @Body() dto: SchedulePsychologicalExamDto,
  ): Promise<PsychologicalExamDto> {
    return this.service.schedule(req.user.id, dto);
  }

  @Post('me/laudo')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: PsychologicalExamDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildUploadStorage('psychological'),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  uploadLaudo(
    @Req() req: RequestWithUser,
    @Body() dto: UploadPsychologicalLaudoDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PsychologicalExamDto> {
    if (!file) {
      throw new BadRequestException('Laudo file is required');
    }
    return this.service.uploadLaudo(req.user.id, dto, file.path);
  }

  @Get('me/protocol/pdf')
  async downloadProtocol(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const buf = await this.service.buildProtocolPdfBuffer(req.user.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="protocolo-psicologico.pdf"',
    );
    res.end(buf);
  }
}
```

- [ ] **Step 8.2: Module**

```typescript
// src/modules/psychological-exam/psychological-exam.module.ts
import { Module } from '@nestjs/common';
import { PsychologicalExamController } from './psychological-exam.controller';
import { PsychologicalExamService } from './psychological-exam.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JourneyModule, AuthModule],
  controllers: [PsychologicalExamController],
  providers: [PsychologicalExamService],
  exports: [PsychologicalExamService],
})
export class PsychologicalExamModule {}
```

- [ ] **Step 8.3: Importar no `AppModule`**

```typescript
import { PsychologicalExamModule } from './modules/psychological-exam/psychological-exam.module';

// imports[]:
    PsychologicalExamModule,
```

- [ ] **Step 8.4: E2E**

```typescript
// test/psychological-exam.e2e-spec.ts
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

describe('PsychologicalExam (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let psyClinicId: string;

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
    const clinic = await prisma.clinic.findFirst({
      where: { type: 'PSYCHOLOGICAL', isActive: true },
    });
    if (!clinic) {
      throw new Error('No PSYCHOLOGICAL clinic seeded');
    }
    psyClinicId = clinic.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('schedule + uploadLaudo transitions PSYCH_PENDING → THEORY_EXAM_PENDING', async () => {
    const token = await login(app, 'student-psych@email.com');

    await request(app.getHttpServer())
      .post('/api/v1/psychological-exam/me/schedule')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clinicId: psyClinicId,
        scheduledAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/psychological-exam/me/laudo')
      .set('Authorization', `Bearer ${token}`)
      .field('result', 'APTO')
      .field(
        'validUntil',
        new Date(Date.now() + 365 * 86400000).toISOString(),
      )
      .attach('file', Buffer.from('%PDF-fake'), {
        filename: 'laudo.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const journey = await request(app.getHttpServer())
      .get('/api/v1/journey/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(journey.body.data.stage).toBe('THEORY_EXAM_PENDING');
  });

  it('GET /psychological-exam/me/protocol/pdf returns application/pdf', async () => {
    const token = await login(app, 'student-psych@email.com');
    const res = await request(app.getHttpServer())
      .get('/api/v1/psychological-exam/me/protocol/pdf')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });
});
```

- [ ] **Step 8.5: Rodar build + e2e**

```bash
npm run build && npm run test:e2e -- psychological-exam
```

- [ ] **Step 8.6: Commit**

```bash
git add src/modules/psychological-exam/psychological-exam.controller.ts src/modules/psychological-exam/psychological-exam.module.ts src/app.module.ts test/psychological-exam.e2e-spec.ts
git commit -m "feat(psychological-exam): controller + module + e2e em /api/v1/psychological-exam"
```

---

## Task 9: `TheoryExamOfficialService` com TDD

**Files:**

- Create: `src/modules/theory-exam-official/dto/record-theory-exam.dto.ts`
- Create: `src/modules/theory-exam-official/dto/theory-exam.dto.ts`
- Create: `src/modules/theory-exam-official/theory-exam.service.ts`
- Create: `src/modules/theory-exam-official/theory-exam.service.spec.ts`

- [ ] **Step 9.1: DTOs**

```typescript
// src/modules/theory-exam-official/dto/record-theory-exam.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsOptional, Max, Min } from 'class-validator';

export class RecordTheoryExamDto {
  @ApiProperty({ example: '2026-06-15T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  takenAt!: Date;

  @ApiPropertyOptional({ example: 26 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  score?: number;

  @ApiProperty({ example: true })
  @Type(() => Boolean)
  @IsBoolean()
  passed!: boolean;
}
```

```typescript
// src/modules/theory-exam-official/dto/theory-exam.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class OfficialTheoryExamDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  takenAt!: Date;
  @ApiProperty({ required: false, nullable: true })
  score!: number | null;
  @ApiProperty()
  passed!: boolean;
  @ApiProperty({ required: false, nullable: true })
  proofUrl!: string | null;
  @ApiProperty()
  createdAt!: Date;
}
```

- [ ] **Step 9.2: Testes (TDD)**

```typescript
// src/modules/theory-exam-official/theory-exam.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TheoryExamOfficialService } from './theory-exam.service';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';

describe('TheoryExamOfficialService', () => {
  let service: TheoryExamOfficialService;
  let prisma: {
    officialTheoryExam: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let journey: { refresh: jest.Mock };

  beforeEach(async () => {
    prisma = {
      officialTheoryExam: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    journey = {
      refresh: jest.fn().mockResolvedValue({ stage: 'AWAITING_LADV_UPLOAD' }),
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        TheoryExamOfficialService,
        { provide: PrismaService, useValue: prisma },
        { provide: JourneyService, useValue: journey },
      ],
    }).compile();
    service = mod.get(TheoryExamOfficialService);
  });

  it('record passed=true refreshes journey to AWAITING_LADV_UPLOAD', async () => {
    prisma.officialTheoryExam.upsert.mockResolvedValue({
      id: 'e1',
      passed: true,
      takenAt: new Date('2026-06-15'),
      score: 26,
    });
    const r = await service.record(
      'stu-1',
      {
        takenAt: new Date('2026-06-15'),
        passed: true,
        score: 26,
      },
      null,
    );
    expect(prisma.officialTheoryExam.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: 'stu-1' },
        create: expect.objectContaining({
          studentId: 'stu-1',
          passed: true,
          score: 26,
        }),
      }),
    );
    expect(journey.refresh).toHaveBeenCalledWith('stu-1');
    expect(r.passed).toBe(true);
  });

  it('record passed=false stores the attempt and journey stays at THEORY_EXAM_PENDING', async () => {
    journey.refresh.mockResolvedValue({ stage: 'THEORY_EXAM_PENDING' });
    prisma.officialTheoryExam.upsert.mockResolvedValue({
      id: 'e1',
      passed: false,
      takenAt: new Date('2026-06-15'),
      score: 19,
    });
    const r = await service.record(
      'stu-1',
      {
        takenAt: new Date('2026-06-15'),
        passed: false,
        score: 19,
      },
      null,
    );
    expect(r.passed).toBe(false);
    expect(journey.refresh).toHaveBeenCalledWith('stu-1');
  });

  it('record stores proofUrl when file is provided', async () => {
    prisma.officialTheoryExam.upsert.mockResolvedValue({
      id: 'e1',
      passed: true,
      takenAt: new Date(),
      proofUrl: '/uploads/theory-exam/stu-1/p.pdf',
    });
    await service.record(
      'stu-1',
      {
        takenAt: new Date(),
        passed: true,
      },
      '/uploads/theory-exam/stu-1/p.pdf',
    );
    expect(prisma.officialTheoryExam.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          proofUrl: '/uploads/theory-exam/stu-1/p.pdf',
        }),
      }),
    );
  });

  it('getMine returns the stored record or null', async () => {
    prisma.officialTheoryExam.findUnique.mockResolvedValue({
      id: 'e1',
      passed: true,
    });
    const r = await service.getMine('stu-1');
    expect(r?.id).toBe('e1');
  });
});
```

- [ ] **Step 9.3: Rodar os testes — devem falhar**

```bash
npm test -- theory-exam.service
```

- [ ] **Step 9.4: Implementar `theory-exam.service.ts`**

```typescript
// src/modules/theory-exam-official/theory-exam.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';
import { RecordTheoryExamDto } from './dto/record-theory-exam.dto';
import { OfficialTheoryExamDto } from './dto/theory-exam.dto';

@Injectable()
export class TheoryExamOfficialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journey: JourneyService,
  ) {}

  async getMine(studentId: string): Promise<OfficialTheoryExamDto | null> {
    return (await this.prisma.officialTheoryExam.findUnique({
      where: { studentId },
    })) as OfficialTheoryExamDto | null;
  }

  async record(
    studentId: string,
    dto: RecordTheoryExamDto,
    proofUrl: string | null,
  ): Promise<OfficialTheoryExamDto> {
    const record = await this.prisma.officialTheoryExam.upsert({
      where: { studentId },
      create: {
        studentId,
        takenAt: dto.takenAt,
        score: dto.score ?? null,
        passed: dto.passed,
        proofUrl,
      },
      update: {
        takenAt: dto.takenAt,
        score: dto.score ?? null,
        passed: dto.passed,
        ...(proofUrl ? { proofUrl } : {}),
      },
    });
    await this.journey.refresh(studentId);
    return record as OfficialTheoryExamDto;
  }
}
```

- [ ] **Step 9.5: Rodar os testes — devem passar**

```bash
npm test -- theory-exam.service
```

Esperado: `PASS — Tests: 4 passed`.

- [ ] **Step 9.6: Commit**

```bash
git add src/modules/theory-exam-official/dto/ src/modules/theory-exam-official/theory-exam.service.ts src/modules/theory-exam-official/theory-exam.service.spec.ts
git commit -m "feat(theory-exam-official): service auto-declarado + comprovante opcional"
```

---

## Task 10: `TheoryExamOfficialController` + module + e2e

**Files:**

- Create: `src/modules/theory-exam-official/theory-exam.controller.ts`
- Create: `src/modules/theory-exam-official/theory-exam.module.ts`
- Create: `test/theory-exam.e2e-spec.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 10.1: Controller**

```typescript
// src/modules/theory-exam-official/theory-exam.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
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
import { TheoryExamOfficialService } from './theory-exam.service';
import { RecordTheoryExamDto } from './dto/record-theory-exam.dto';
import { OfficialTheoryExamDto } from './dto/theory-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildUploadStorage,
  MAX_UPLOAD_BYTES,
  uploadFileFilter,
} from '../../common/uploads/upload-storage';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('theory-exam')
@ApiBearerAuth()
@Controller('theory-exam')
@UseGuards(JwtAuthGuard)
export class TheoryExamOfficialController {
  constructor(private readonly service: TheoryExamOfficialService) {}

  @Get('me')
  @ApiOkResponse({ type: OfficialTheoryExamDto })
  async getMine(
    @Req() req: RequestWithUser,
  ): Promise<OfficialTheoryExamDto | null> {
    return this.service.getMine(req.user.id);
  }

  @Post('me')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOkResponse({ type: OfficialTheoryExamDto })
  @UseInterceptors(
    FileInterceptor('proofFile', {
      storage: buildUploadStorage('theory-exam'),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  record(
    @Req() req: RequestWithUser,
    @Body() dto: RecordTheoryExamDto,
    @UploadedFile() proofFile?: Express.Multer.File,
  ): Promise<OfficialTheoryExamDto> {
    return this.service.record(req.user.id, dto, proofFile?.path ?? null);
  }
}
```

- [ ] **Step 10.2: Module**

```typescript
// src/modules/theory-exam-official/theory-exam.module.ts
import { Module } from '@nestjs/common';
import { TheoryExamOfficialController } from './theory-exam.controller';
import { TheoryExamOfficialService } from './theory-exam.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JourneyModule, AuthModule],
  controllers: [TheoryExamOfficialController],
  providers: [TheoryExamOfficialService],
})
export class TheoryExamOfficialModule {}
```

- [ ] **Step 10.3: Importar no `AppModule`**

```typescript
import { TheoryExamOfficialModule } from './modules/theory-exam-official/theory-exam.module';

// imports[]:
    TheoryExamOfficialModule,
```

- [ ] **Step 10.4: E2E**

```typescript
// test/theory-exam.e2e-spec.ts
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

describe('TheoryExamOfficial (e2e)', () => {
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

  it('POST /theory-exam/me with passed=true transitions THEORY_EXAM_PENDING → AWAITING_LADV_UPLOAD', async () => {
    const token = await login(app, 'student-theory@email.com');

    await request(app.getHttpServer())
      .post('/api/v1/theory-exam/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        takenAt: new Date().toISOString(),
        passed: true,
        score: 28,
      })
      .expect(201);

    const journey = await request(app.getHttpServer())
      .get('/api/v1/journey/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(journey.body.data.stage).toBe('AWAITING_LADV_UPLOAD');
  });

  it('POST /theory-exam/me with score above 30 returns 400', async () => {
    const token = await login(app, 'student-theory@email.com');
    await request(app.getHttpServer())
      .post('/api/v1/theory-exam/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        takenAt: new Date().toISOString(),
        passed: true,
        score: 99,
      })
      .expect(400);
  });
});
```

- [ ] **Step 10.5: Rodar build + e2e**

```bash
npm run build && npm run test:e2e -- theory-exam
```

- [ ] **Step 10.6: Commit**

```bash
git add src/modules/theory-exam-official/theory-exam.controller.ts src/modules/theory-exam-official/theory-exam.module.ts src/app.module.ts test/theory-exam.e2e-spec.ts
git commit -m "feat(theory-exam-official): controller + module + e2e em /api/v1/theory-exam"
```

---

## Task 11: Endpoint `POST /students/me/theory-course/start`

Endpoint da etapa 2 da Resolução. Marca `theoryCourseStartedAt` e força refresh do journeyStage.

**Files:**

- Modify: `src/modules/students/students.controller.ts`
- Modify: `src/modules/students/students.service.ts`
- Modify: `src/modules/students/students.module.ts`

- [ ] **Step 11.1: Adicionar método `startTheoryCourse` em `students.service.ts`**

Localizar a classe `StudentsService` em `src/modules/students/students.service.ts` e adicionar:

```typescript
import { JourneyService } from '../journey/journey.service';
// ...

// adicionar JourneyService no construtor:
constructor(
  private readonly prisma: PrismaService,
  private readonly journey: JourneyService,
) {}

// método novo:
async startTheoryCourse(studentId: string) {
  const updated = await this.prisma.student.update({
    where: { id: studentId },
    data: { theoryCourseStartedAt: new Date() },
    select: {
      id: true,
      theoryCourseStartedAt: true,
    },
  });
  const state = await this.journey.refresh(studentId);
  return {
    theoryCourseStartedAt: updated.theoryCourseStartedAt,
    stage: state.stage,
  };
}
```

Se o construtor atual usa outro padrão (ex.: sem `private readonly`), adaptar para o padrão existente do arquivo. Se a dependência `JourneyService` causar dependência circular com algum outro service, mover para `forwardRef` — improvável neste caso porque `JourneyService` não importa `StudentsService`.

- [ ] **Step 11.2: Adicionar `JourneyModule` em `students.module.ts`**

```typescript
import { JourneyModule } from '../journey/journey.module';
// ...
@Module({
  imports: [PrismaModule, JourneyModule],
  // ...
})
export class StudentsModule {}
```

(Manter os imports/exports existentes.)

- [ ] **Step 11.3: Adicionar endpoint no `students.controller.ts`**

Localizar a classe `StudentsController` e adicionar:

```typescript
import { Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser {
  user: { id: string };
}

// método novo, antes do final da classe:
@Post('me/theory-course/start')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
startTheoryCourse(@Req() req: RequestWithUser) {
  return this.studentsService.startTheoryCourse(req.user.id);
}
```

Garantir que `JwtAuthGuard` e `Req` estejam importados no topo do arquivo (caso já não estejam).

- [ ] **Step 11.4: Atualizar `students.controller.spec.ts` se existir**

```bash
ls src/modules/students/students.controller.spec.ts 2>/dev/null
```

Se o arquivo existir, atualizar o setup do mock de `StudentsService` para incluir `startTheoryCourse: jest.fn()`. Se não existir, pular.

- [ ] **Step 11.5: E2E adicional**

Adicionar caso no e2e existente (ou criar novo arquivo curto), porém o caso mais limpo é cobrir no e2e da journey já existente: editar `test/journey.e2e-spec.ts` adicionando o teste:

```typescript
// adicionar dentro do describe('Journey (e2e)', ...):
it('POST /students/me/theory-course/start transitions REGISTERED → RENACH_PENDING', async () => {
  const token = await login(app, 'student-registered@email.com');
  await request(app.getHttpServer())
    .post('/api/v1/students/me/theory-course/start')
    .set('Authorization', `Bearer ${token}`)
    .expect(201);
  const journey = await request(app.getHttpServer())
    .get('/api/v1/journey/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  expect(journey.body.data.stage).toBe('RENACH_PENDING');
});
```

- [ ] **Step 11.6: Rodar testes**

```bash
npm run build && npm test && npm run test:e2e -- journey
```

- [ ] **Step 11.7: Commit**

```bash
git add src/modules/students/ test/journey.e2e-spec.ts
git commit -m "feat(students): endpoint POST me/theory-course/start (CONTRAN etapa 2)"
```

---

## Task 12: Seeds intermediários (`student-psych`, `student-theory`, `student-awaiting-ladv`)

Para que os e2e de psychological-exam (`student-psych`) e theory-exam (`student-theory`) tenham dados em PSYCH_PENDING e THEORY_EXAM_PENDING respectivamente, precisamos seed dedicado. Também adicionamos `student-awaiting-ladv` para fechar o ciclo até a próxima etapa do LADV.

**Files:**

- Modify: `prisma/seed.ts`

- [ ] **Step 12.1: Adicionar blocos no `prisma/seed.ts`**

Localizar a seção de "Journey Foundation seed" criada pelo plano Foundation. Logo após o bloco do `student-medical@email.com`, inserir os três novos alunos (todos com `bcrypt.hash('123456')` já reutilizado da variável `journeyPassword`):

```typescript
// STAGE: PSYCH_PENDING — RENACH DONE + MEDICAL APTO + sem PSYCH
const psych = await prisma.student.upsert({
  where: { email: 'student-psych@email.com' },
  update: {},
  create: {
    email: 'student-psych@email.com',
    name: 'Aluno Aguardando Psico',
    cpf: '66666666666',
    password: journeyPassword,
    theoryCourseStartedAt: pastDate(10),
    journeyStage: 'PSYCH_PENDING',
  },
});
await prisma.renachProcess.upsert({
  where: { studentId: psych.id },
  update: {},
  create: {
    studentId: psych.id,
    renachNumber: 'RNC-2026-00006',
    ufDetran: 'SP',
    biometryDoneAt: pastDate(7),
    status: 'DONE',
  },
});
await prisma.medicalExam.upsert({
  where: { studentId: psych.id },
  update: {},
  create: {
    studentId: psych.id,
    protocolCode: 'MED-2026-PSY1',
    result: 'APTO',
    status: 'RESULT_UPLOADED',
    performedAt: pastDate(5),
    validUntil: futureDate(360),
  },
});

// STAGE: THEORY_EXAM_PENDING — RENACH DONE + MEDICAL APTO + PSYCH APTO
const theory = await prisma.student.upsert({
  where: { email: 'student-theory@email.com' },
  update: {},
  create: {
    email: 'student-theory@email.com',
    name: 'Aluno Aguardando Teórico Oficial',
    cpf: '77777777777',
    password: journeyPassword,
    theoryCourseStartedAt: pastDate(20),
    journeyStage: 'THEORY_EXAM_PENDING',
  },
});
await prisma.renachProcess.upsert({
  where: { studentId: theory.id },
  update: {},
  create: {
    studentId: theory.id,
    renachNumber: 'RNC-2026-00007',
    ufDetran: 'SP',
    biometryDoneAt: pastDate(15),
    status: 'DONE',
  },
});
await prisma.medicalExam.upsert({
  where: { studentId: theory.id },
  update: {},
  create: {
    studentId: theory.id,
    protocolCode: 'MED-2026-THE1',
    result: 'APTO',
    status: 'RESULT_UPLOADED',
    performedAt: pastDate(10),
    validUntil: futureDate(355),
  },
});
await prisma.psychologicalExam.upsert({
  where: { studentId: theory.id },
  update: {},
  create: {
    studentId: theory.id,
    protocolCode: 'PSY-2026-THE1',
    result: 'APTO',
    status: 'RESULT_UPLOADED',
    performedAt: pastDate(8),
    validUntil: futureDate(357),
  },
});

// STAGE: AWAITING_LADV_UPLOAD — todos os anteriores + theory exam passed
const awaitLadv = await prisma.student.upsert({
  where: { email: 'student-awaiting-ladv@email.com' },
  update: {},
  create: {
    email: 'student-awaiting-ladv@email.com',
    name: 'Aluno Aguardando Upload LADV',
    cpf: '88888888888',
    password: journeyPassword,
    theoryCourseStartedAt: pastDate(30),
    journeyStage: 'AWAITING_LADV_UPLOAD',
  },
});
await prisma.renachProcess.upsert({
  where: { studentId: awaitLadv.id },
  update: {},
  create: {
    studentId: awaitLadv.id,
    renachNumber: 'RNC-2026-00008',
    ufDetran: 'SP',
    biometryDoneAt: pastDate(25),
    status: 'DONE',
  },
});
await prisma.medicalExam.upsert({
  where: { studentId: awaitLadv.id },
  update: {},
  create: {
    studentId: awaitLadv.id,
    protocolCode: 'MED-2026-AWL1',
    result: 'APTO',
    status: 'RESULT_UPLOADED',
    performedAt: pastDate(18),
    validUntil: futureDate(350),
  },
});
await prisma.psychologicalExam.upsert({
  where: { studentId: awaitLadv.id },
  update: {},
  create: {
    studentId: awaitLadv.id,
    protocolCode: 'PSY-2026-AWL1',
    result: 'APTO',
    status: 'RESULT_UPLOADED',
    performedAt: pastDate(16),
    validUntil: futureDate(352),
  },
});
await prisma.officialTheoryExam.upsert({
  where: { studentId: awaitLadv.id },
  update: {},
  create: {
    studentId: awaitLadv.id,
    takenAt: pastDate(5),
    passed: true,
    score: 27,
  },
});
```

- [ ] **Step 12.2: Rodar o seed**

```bash
npx prisma db seed
```

Esperado: 3 novos alunos criados, idempotente em re-execuções.

- [ ] **Step 12.3: Conferir os stages via journey/me**

```bash
# Apenas conferência manual via Swagger ou:
npm run test:e2e -- journey
```

Esperado: e2e da journey ainda passa.

- [ ] **Step 12.4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): alunos em PSYCH_PENDING, THEORY_EXAM_PENDING e AWAITING_LADV_UPLOAD"
```

---

## Task 13: Atualizar `CLAUDE.md`

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 13.1: Adicionar os 4 módulos na estrutura de pastas**

Localizar o bloco `## Estrutura de Pastas` em `CLAUDE.md`. Adicionar (alfabeticamente):

```
├── medical-exam/      # agendamento + upload de laudo + protocolo PDF (CONTRAN etapa 4)
├── psychological-exam/ # agendamento + upload de laudo (CONTRAN etapa 5)
├── renach-process/    # guia por UF + auto-declaração RENACH (CONTRAN etapa 3)
├── theory-exam-official/ # exame teórico oficial auto-declarado (CONTRAN etapa 6)
```

- [ ] **Step 13.2: Atualizar a seção "Regras Importantes" se necessário**

Adicionar item:

```
- **Refresh da journey:** após qualquer mutação em RenachProcess, MedicalExam, PsychologicalExam, OfficialTheoryExam ou theoryCourseStartedAt, chamar `JourneyService.refresh(studentId)` para atualizar o cache de `journeyStage`
```

- [ ] **Step 13.3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: documenta módulos pré-práticos no CLAUDE.md"
```

---

## Self-Review Checklist (executado antes da entrega)

**Spec coverage** — cada requisito das seções 5, 6 e 11 do spec:

- ✅ Módulo `renach-process/` com guide por UF + schedule + done (Seção 6) — Tasks 2, 3
- ✅ Módulo `medical-exam/` com schedule + uploadLaudo + protocol/pdf (Seção 6) — Tasks 4, 5, 6
- ✅ Módulo `psychological-exam/` espelhando medical (Seção 6) — Tasks 7, 8
- ✅ Módulo `theory-exam-official/` auto-declarado com comprovante opcional (Seção 6) — Tasks 9, 10
- ✅ `POST /students/me/theory-course/start` (Seção 6) — Task 11
- ✅ Refresh do `journeyStage` em todas as mutações (Seção 3) — Tasks 2, 5, 7, 9, 11
- ✅ Upload multipart com mime PDF/JPG/PNG e 10 MB (Seção 6) — Task 1
- ✅ Pastas `uploads/{module}/{studentId}/` (Seção 6) — Task 1
- ✅ Seeds com alunos em PSYCH_PENDING, THEORY_EXAM_PENDING e AWAITING_LADV_UPLOAD (Seção 11) — Task 12
- ⏭ Validação cruzada de RENACH via `ValidationService` (Seção 7) — opcional, não obrigatória no MVP; pode ser adicionada com 1 chamada a `validation.validateRenach()` no `complete()` do RenachProcess se desejado pelo time

**Placeholder scan** — sem TBD/TODO/"implement later". Cada step inclui código completo. PsychologicalExam reutiliza `buildProtocolPdf` do MedicalExam por import explícito; não é "similar to" — é a mesma função pura aplicada com `examType` diferente.

**Type consistency** — `JourneyService.refresh(studentId)` declarado no plano Foundation (Task 4) e consumido em Tasks 2, 5, 7, 9, 11. `Clinic.type` enum `MEDICAL | PSYCHOLOGICAL` aplicado em Task 5 (gate MedicalExam) e Task 7 (gate PsychologicalExam). DTO patterns (`ApiProperty`, `Type(() => Date)`, `IsDate`, `IsIn`) consistentes nos 4 módulos.

**Estado terminal deste sub-plano:**

- 4 módulos verticais operacionais cobrindo etapas 2–6 da Resolução CONTRAN 1.020/2025.
- Endpoint `POST /students/me/theory-course/start` em `students/` reaproveitando o módulo existente.
- Protocolo PDF unificado via função pura compartilhada `buildProtocolPdf`.
- 3 alunos seed novos cobrindo os 3 stages intermediários.
- E2E completo verificando a cadeia `REGISTERED → RENACH_PENDING → MEDICAL_PENDING → PSYCH_PENDING → THEORY_EXAM_PENDING → AWAITING_LADV_UPLOAD`.
- 100% dos testes unitários e e2e verdes.

**Próximo sub-plano:** `2026-05-14-ladv-and-lesson-gate.md` consome `journeyStage = AWAITING_LADV_UPLOAD` produzido por este plano e cobre upload da LADV + gate de aula prática em `LessonsService.create()`.
