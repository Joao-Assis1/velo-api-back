# Stripe Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir completamente o gateway Asaas pelo Stripe Connect (Destination Charges com transfer atrasado), migrando os modelos `Payment` e `PaymentMethod` para os campos `stripePaymentIntentId`, `stripeTransferId`, `stripeRefundId` e `stripePaymentMethodId`. Esta migração desbloqueia o release de escrow após aula concluída + compliance OK, o onboarding de instrutor via Stripe Connect Express, a resolução de disputas pelo admin, e o fluxo de webhooks com verificação de assinatura. O módulo `payments/` legado (Asaas) é removido na mesma migration — não há manutenção em paralelo.

**Architecture:** Novo módulo `payments-stripe/` substitui inteiramente `payments/`. Camadas: (1) `StripeClient` (factory singleton com chave secreta + idempotency helpers); (2) `PaymentsStripeService` (orquestra setup-intent, charge, transfer, refund); (3) `StripeConnectService` (onboarding de instrutor via Account Link); (4) `StripeWebhooksController` (verificação HMAC, dispatch por event type); (5) `PaymentsStripeController` (endpoints do aluno e admin). `PaymentMethodsService` migra para usar `stripePaymentMethodId`. `LessonsService.completeLesson()` ganha trigger de release ao final, executado dentro da mesma transação para garantir atomicidade. `Instructor` ganha gate de busca por `stripeAccountStatus=ACTIVE` (alinhado com o `credentialStatus=APPROVED` da fase prática). Idempotência aplicada em todas as mutações Stripe via `Idempotency-Key` UUID derivada de `(lessonId|paymentId, action)`.

**Tech Stack:** NestJS 11 + Prisma 7 + Stripe Node SDK 17 + Jest. Dependência nova: `stripe`. Webhooks usam `bodyParser.raw()` no middleware (configuração específica). Pasta `src/modules/payments-stripe/`. Endpoints `/api/v1/payments-stripe/*` e `/api/v1/webhooks/stripe`.

**Spec de referência:** `docs/superpowers/specs/2026-05-14-brazilian-license-system-design.md` — Seção 4 (Payment + PaymentMethod schema), Seção 6 (endpoints `/payments-stripe/*` e `/webhooks/stripe`), Seção 9 inteira (modelo Stripe, onboarding, webhooks, idempotência), Seção 8 (release condicionado a `isValidForCompliance` — definido no sub-plano `ladv-and-lesson-gate`).

**Critério de pronto:**
- Schema migrado: `Payment.asaasId` removido, `stripePaymentIntentId`/`stripeTransferId`/`stripeRefundId` adicionados; `PaymentMethod.token` removido, `stripePaymentMethodId` + `brand` adicionados.
- `POST /api/v1/payments-stripe/setup-intent` retorna `{ clientSecret }` real do Stripe (mockado em testes).
- `POST /api/v1/payments-stripe/payment-methods` salva `stripePaymentMethodId` com idempotência por aluno.
- `POST /api/v1/payments-stripe/charge { lessonId, paymentMethodId }` cria PaymentIntent e devolve `Payment.status=HELD` após webhook `payment_intent.succeeded`.
- `LessonsService.completeLesson()` aciona transfer somente se `isValidForCompliance(lesson)=true` e atualiza `Payment.status=RELEASED` + `stripeTransferId`.
- `POST /api/v1/payments-stripe/connect/onboard` retorna URL de Account Link para o instrutor concluir onboarding.
- Webhook `account.updated` atualiza `stripeAccountStatus=ACTIVE` quando `payouts_enabled=true`.
- `POST /api/v1/payments-stripe/disputes/:lessonId/resolve { action: 'release' | 'refund' }` aciona transfer ou refund consistente.
- `POST /api/v1/webhooks/stripe` rejeita 400 quando assinatura é inválida.
- Módulo `payments/` Asaas removido do filesystem e do `AppModule`.
- `Instructor.findMany()` na busca de alunos filtra por `stripeAccountStatus=ACTIVE` e `credentialStatus=APPROVED`.
- `npm test` e `npm run test:e2e` verdes.

---

## File Structure

**Created (22 arquivos):**

- `src/modules/payments-stripe/payments-stripe.module.ts`
- `src/modules/payments-stripe/payments-stripe.controller.ts`
- `src/modules/payments-stripe/payments-stripe.service.ts`
- `src/modules/payments-stripe/payments-stripe.service.spec.ts`
- `src/modules/payments-stripe/stripe-connect.service.ts`
- `src/modules/payments-stripe/stripe-connect.service.spec.ts`
- `src/modules/payments-stripe/stripe.client.ts` — factory + singleton
- `src/modules/payments-stripe/stripe-webhooks.controller.ts`
- `src/modules/payments-stripe/stripe-webhooks.controller.spec.ts`
- `src/modules/payments-stripe/lib/idempotency.ts` — UUID derivada determinística
- `src/modules/payments-stripe/lib/idempotency.spec.ts`
- `src/modules/payments-stripe/lib/event-router.ts` — função pura mapeando eventos Stripe a handlers
- `src/modules/payments-stripe/lib/event-router.spec.ts`
- `src/modules/payments-stripe/dto/charge.dto.ts`
- `src/modules/payments-stripe/dto/payment-method.dto.ts`
- `src/modules/payments-stripe/dto/resolve-dispute.dto.ts`
- `src/modules/payments-stripe/dto/setup-intent-response.dto.ts`
- `src/modules/payments-stripe/dto/connect-status.dto.ts`
- `test/payments-stripe.e2e-spec.ts`
- `test/stripe-webhooks.e2e-spec.ts`
- `test/stripe-connect.e2e-spec.ts`

**Modified:**

- `prisma/schema.prisma` — `Payment` e `PaymentMethod` migrados
- `prisma/seed.ts` — substitui campos antigos por placeholders Stripe (`pm_seed_*`, `pi_seed_*`)
- `src/modules/payment-methods/payment-methods.service.ts` — refatorada para Stripe
- `src/modules/payment-methods/payment-methods.controller.ts` — remove fluxo de criação manual (agora vai pelo `/payments-stripe/payment-methods`); mantém listagem/default/delete
- `src/modules/payment-methods/dtos/*` — atualizados
- `src/modules/lessons/lessons.service.ts` — `completeLesson()` aciona `PaymentsStripeService.releaseEscrow()`
- `src/modules/lessons/lessons.service.spec.ts` — cobre release condicional
- `src/modules/lessons/lessons.module.ts` — importa `PaymentsStripeModule` (replace de `PaymentsModule`)
- `src/modules/instructors/instructors.service.ts` — `findAll()` ativos = `credentialStatus=APPROVED AND stripeAccountStatus=ACTIVE`
- `src/modules/instructors/instructors.service.spec.ts` — cobre filtro novo
- `src/main.ts` — registra raw body parser para `/api/v1/webhooks/stripe`
- `src/app.module.ts` — remove `PaymentsModule`, adiciona `PaymentsStripeModule`
- `src/config/env.validation.ts` — adiciona envs Stripe, remove `ASAAS_API_KEY`
- `package.json` — adiciona `stripe`, remove qualquer dep Asaas se houver
- `CLAUDE.md` — atualiza estrutura de pastas, envs, e "Regras Importantes"

**Removed:**

- `src/modules/payments/` (pasta inteira: asaas.service, payments.service, escrow.service, disputes.service, payments.controller, disputes.controller, webhooks.controller, dto/)

---

## Task 1: Schema migration + dependência Stripe + envs

**Files:**

- Modify: `prisma/schema.prisma`
- Modify: `src/config/env.validation.ts`
- Modify: `package.json`

- [ ] **Step 1.1: Instalar Stripe SDK e remover dep Asaas (se existir)**

```bash
npm install stripe
```

Verificar `package.json` por dependências Asaas (`asaas-sdk`, `@asaas/...`, etc.) e remover:

```bash
npm uninstall asaas-sdk 2>/dev/null || true
```

Esperado: `stripe@17.x` adicionado em `dependencies`.

- [ ] **Step 1.2: Atualizar `model PaymentMethod` no schema**

Em `prisma/schema.prisma`, substituir o bloco `model PaymentMethod` por:

```prisma
model PaymentMethod {
  id                    String    @id @default(uuid())
  studentId             String
  stripePaymentMethodId String    @unique
  brand                 String    // visa | mastercard | amex | elo | hipercard
  last4                 String
  cardholderName        String
  expiryMonth           String
  expiryYear            String
  isDefault             Boolean   @default(false)
  isDeleted             Boolean   @default(false)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  student               Student   @relation(fields: [studentId], references: [id])
  payments              Payment[]

  @@index([studentId, isDeleted])
}
```

A constraint composta `@@unique([studentId, token])` é dropada — `stripePaymentMethodId` já é `@unique` globalmente.

- [ ] **Step 1.3: Atualizar `model Payment` no schema**

Substituir o bloco `model Payment` por:

```prisma
model Payment {
  id                    String         @id @default(uuid())
  amount                Float
  status                String         @default("PENDING")  // PENDING | HELD | RELEASED | REFUNDED | FAILED
  studentId             String
  lessonId              String?        @unique
  paymentMethodId       String?
  stripePaymentIntentId String?        @unique
  stripeTransferId      String?        @unique
  stripeRefundId        String?
  failureReason         String?
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
  lesson                Lesson?        @relation(fields: [lessonId], references: [id])
  student               Student        @relation(fields: [studentId], references: [id])
  paymentMethod         PaymentMethod? @relation(fields: [paymentMethodId], references: [id])

  @@index([status])
  @@index([stripePaymentIntentId])
}
```

Campo `asaasId` removido. `failureReason` adicionado para anotar falhas (vindo de webhooks `payment_failed`).

- [ ] **Step 1.4: Adicionar envs Stripe e remover Asaas**

Em `src/config/env.validation.ts`:

```typescript
@IsString()
STRIPE_SECRET_KEY!: string;

@IsString()
STRIPE_WEBHOOK_SECRET!: string;

@IsOptional()
@IsString()
STRIPE_CONNECT_CLIENT_ID?: string;

@IsOptional()
@IsUrl({ require_tld: false, require_protocol: true })
STRIPE_CONNECT_REFRESH_URL?: string = 'http://localhost:3001/api/v1/payments-stripe/connect/refresh';

@IsOptional()
@IsUrl({ require_tld: false, require_protocol: true })
STRIPE_CONNECT_RETURN_URL?: string = 'http://localhost:3001/api/v1/payments-stripe/connect/return';
```

Remover `ASAAS_API_KEY` (e qualquer outra `ASAAS_*` que exista).

- [ ] **Step 1.5: Gerar migration**

```bash
npx prisma migrate dev --name stripe_migration
npx prisma generate
```

Esperado: nova pasta `prisma/migrations/<timestamp>_stripe_migration/` contendo o ALTER TABLE de Payment e PaymentMethod.

**Cuidado:** a migration vai dropar a coluna `asaasId` e `token`. Em ambiente de produção isso é uma DDL destrutiva. Para o MVP (banco Neon de desenvolvimento) é aceitável; sinalizar isso ao reviewer humano antes de rodar em qualquer ambiente compartilhado.

- [ ] **Step 1.6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ package.json package-lock.json src/config/env.validation.ts
git commit -m "feat(schema): migra Payment e PaymentMethod de Asaas para Stripe"
```

---

## Task 2: `StripeClient` factory + idempotency helper com TDD

**Files:**

- Create: `src/modules/payments-stripe/stripe.client.ts`
- Create: `src/modules/payments-stripe/lib/idempotency.ts`
- Create: `src/modules/payments-stripe/lib/idempotency.spec.ts`

- [ ] **Step 2.1: Testes do helper de idempotência (TDD)**

```typescript
// src/modules/payments-stripe/lib/idempotency.spec.ts
import { idempotencyKey } from './idempotency';

describe('idempotencyKey', () => {
  it('returns the same key for the same (subject, action) pair', () => {
    const a = idempotencyKey('pay-1', 'release');
    const b = idempotencyKey('pay-1', 'release');
    expect(a).toBe(b);
  });

  it('returns different keys for different actions on the same subject', () => {
    expect(idempotencyKey('pay-1', 'release')).not.toBe(
      idempotencyKey('pay-1', 'refund'),
    );
  });

  it('returns different keys for different subjects', () => {
    expect(idempotencyKey('pay-1', 'charge')).not.toBe(
      idempotencyKey('pay-2', 'charge'),
    );
  });

  it('produces a hex string of at least 32 characters', () => {
    const k = idempotencyKey('pay-1', 'charge');
    expect(k).toMatch(/^[a-f0-9]{32,}$/);
  });
});
```

- [ ] **Step 2.2: Implementar `idempotency.ts`**

```typescript
// src/modules/payments-stripe/lib/idempotency.ts
import { createHash } from 'crypto';

export type IdempotentAction =
  | 'setup-intent'
  | 'attach-payment-method'
  | 'detach-payment-method'
  | 'charge'
  | 'release'
  | 'refund'
  | 'connect-account'
  | 'connect-link';

export function idempotencyKey(
  subject: string,
  action: IdempotentAction | string,
): string {
  return createHash('sha256').update(`${subject}|${action}`).digest('hex');
}
```

- [ ] **Step 2.3: Implementar `stripe.client.ts`**

```typescript
// src/modules/payments-stripe/stripe.client.ts
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export const stripeClientProvider = {
  provide: STRIPE_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Stripe => {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      throw new Error(
        'STRIPE_SECRET_KEY is missing — set the env before bootstrapping',
      );
    }
    return new Stripe(key, { apiVersion: '2024-11-20.acacia' });
  },
};

@Injectable()
export class StripeClientHolder {
  constructor(@Inject(STRIPE_CLIENT) public readonly stripe: Stripe) {}
}
```

(Ajustar `apiVersion` para a versão LTS suportada pelo SDK instalado caso `2024-11-20.acacia` não esteja disponível — o SDK loga uma mensagem se a versão for inválida.)

- [ ] **Step 2.4: Rodar os testes**

```bash
npm test -- idempotency
```

Esperado: 4 testes passando.

- [ ] **Step 2.5: Commit**

```bash
git add src/modules/payments-stripe/stripe.client.ts src/modules/payments-stripe/lib/idempotency.ts src/modules/payments-stripe/lib/idempotency.spec.ts
git commit -m "feat(payments-stripe): factory do StripeClient + helper de idempotência"
```

---

## Task 3: `PaymentsStripeService.setupIntent` + payment methods (TDD)

**Files:**

- Create: `src/modules/payments-stripe/dto/payment-method.dto.ts`
- Create: `src/modules/payments-stripe/dto/setup-intent-response.dto.ts`
- Create: `src/modules/payments-stripe/payments-stripe.service.ts`
- Create: `src/modules/payments-stripe/payments-stripe.service.spec.ts`

- [ ] **Step 3.1: DTOs**

```typescript
// src/modules/payments-stripe/dto/setup-intent-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class SetupIntentResponseDto {
  @ApiProperty()
  clientSecret!: string;

  @ApiProperty()
  customerId!: string;
}
```

```typescript
// src/modules/payments-stripe/dto/payment-method.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AttachPaymentMethodDto {
  @ApiProperty({ example: 'pm_1QabcXYZ123' })
  @IsString()
  stripePaymentMethodId!: string;
}

export class PaymentMethodResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  stripePaymentMethodId!: string;
  @ApiProperty()
  brand!: string;
  @ApiProperty()
  last4!: string;
  @ApiProperty()
  cardholderName!: string;
  @ApiProperty()
  expiryMonth!: string;
  @ApiProperty()
  expiryYear!: string;
  @ApiProperty()
  isDefault!: boolean;
}
```

- [ ] **Step 3.2: Escrever testes do setup-intent e attach payment method (TDD)**

```typescript
// src/modules/payments-stripe/payments-stripe.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsStripeService } from './payments-stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from './stripe.client';

describe('PaymentsStripeService', () => {
  let service: PaymentsStripeService;
  let prisma: any;
  let stripe: any;

  beforeEach(async () => {
    prisma = {
      student: { findUnique: jest.fn(), update: jest.fn() },
      paymentMethod: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      lesson: { findUnique: jest.fn() },
      instructor: { findUnique: jest.fn() },
    };
    stripe = {
      customers: { create: jest.fn(), retrieve: jest.fn() },
      setupIntents: { create: jest.fn() },
      paymentMethods: {
        attach: jest.fn(),
        detach: jest.fn(),
        retrieve: jest.fn(),
      },
      paymentIntents: { create: jest.fn() },
      transfers: { create: jest.fn() },
      refunds: { create: jest.fn() },
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsStripeService,
        { provide: PrismaService, useValue: prisma },
        { provide: STRIPE_CLIENT, useValue: stripe },
      ],
    }).compile();
    service = mod.get(PaymentsStripeService);
  });

  describe('createSetupIntent', () => {
    it('creates a Stripe customer on first use and stores stripeCustomerId', async () => {
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        email: 'a@b.com',
        name: 'Aluno X',
        stripeCustomerId: null,
      });
      stripe.customers.create.mockResolvedValue({ id: 'cus_AAA' });
      stripe.setupIntents.create.mockResolvedValue({
        client_secret: 'seti_secret_XYZ',
      });
      prisma.student.update.mockResolvedValue({});

      const r = await service.createSetupIntent('stu-1');

      expect(stripe.customers.create).toHaveBeenCalledWith(
        { email: 'a@b.com', name: 'Aluno X', metadata: { studentId: 'stu-1' } },
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 'stu-1' },
        data: { stripeCustomerId: 'cus_AAA' },
      });
      expect(stripe.setupIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_AAA',
          payment_method_types: ['card'],
        }),
        { idempotencyKey: expect.any(String) },
      );
      expect(r).toEqual({ clientSecret: 'seti_secret_XYZ', customerId: 'cus_AAA' });
    });

    it('reuses existing customer when stripeCustomerId is set', async () => {
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        email: 'a@b.com',
        name: 'Aluno X',
        stripeCustomerId: 'cus_EXISTING',
      });
      stripe.setupIntents.create.mockResolvedValue({
        client_secret: 'seti_secret_2',
      });
      const r = await service.createSetupIntent('stu-1');
      expect(stripe.customers.create).not.toHaveBeenCalled();
      expect(r.customerId).toBe('cus_EXISTING');
    });
  });

  describe('attachPaymentMethod', () => {
    it('attaches PM to customer, fetches card metadata, persists local row', async () => {
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        stripeCustomerId: 'cus_EXISTING',
      });
      stripe.paymentMethods.attach.mockResolvedValue({});
      stripe.paymentMethods.retrieve.mockResolvedValue({
        id: 'pm_1Q',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2030,
        },
        billing_details: { name: 'JOAO SILVA' },
      });
      prisma.paymentMethod.findMany.mockResolvedValue([]); // no existing methods
      prisma.paymentMethod.create.mockResolvedValue({
        id: 'pm-row-1',
        stripePaymentMethodId: 'pm_1Q',
        brand: 'visa',
        last4: '4242',
        cardholderName: 'JOAO SILVA',
        expiryMonth: '12',
        expiryYear: '2030',
        isDefault: true,
      });

      const r = await service.attachPaymentMethod('stu-1', { stripePaymentMethodId: 'pm_1Q' });
      expect(stripe.paymentMethods.attach).toHaveBeenCalledWith(
        'pm_1Q',
        { customer: 'cus_EXISTING' },
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.paymentMethod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stripePaymentMethodId: 'pm_1Q',
            brand: 'visa',
            last4: '4242',
            isDefault: true, // first one becomes default
          }),
        }),
      );
      expect(r.brand).toBe('visa');
    });

    it('throws when student has no Stripe customer yet', async () => {
      prisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        stripeCustomerId: null,
      });
      await expect(
        service.attachPaymentMethod('stu-1', { stripePaymentMethodId: 'pm_1Q' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('detachPaymentMethod', () => {
    it('detaches at Stripe, marks isDeleted=true (soft delete)', async () => {
      prisma.paymentMethod.findFirst.mockResolvedValue({
        id: 'pm-row-1',
        studentId: 'stu-1',
        stripePaymentMethodId: 'pm_1Q',
        isDeleted: false,
      });
      stripe.paymentMethods.detach.mockResolvedValue({});
      await service.detachPaymentMethod('stu-1', 'pm-row-1');
      expect(stripe.paymentMethods.detach).toHaveBeenCalledWith(
        'pm_1Q',
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.paymentMethod.update).toHaveBeenCalledWith({
        where: { id: 'pm-row-1' },
        data: { isDeleted: true, isDefault: false },
      });
    });

    it('throws NotFoundException when payment method does not belong to student', async () => {
      prisma.paymentMethod.findFirst.mockResolvedValue(null);
      await expect(
        service.detachPaymentMethod('stu-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 3.3: Implementar setup-intent + payment methods em `payments-stripe.service.ts`**

```typescript
// src/modules/payments-stripe/payments-stripe.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from './stripe.client';
import { idempotencyKey } from './lib/idempotency';
import {
  AttachPaymentMethodDto,
  PaymentMethodResponseDto,
} from './dto/payment-method.dto';
import { SetupIntentResponseDto } from './dto/setup-intent-response.dto';

@Injectable()
export class PaymentsStripeService {
  private readonly logger = new Logger(PaymentsStripeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  async createSetupIntent(studentId: string): Promise<SetupIntentResponseDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    let customerId = student.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create(
        {
          email: student.email,
          name: student.name,
          metadata: { studentId: student.id },
        },
        { idempotencyKey: idempotencyKey(student.id, 'connect-account') },
      );
      customerId = customer.id;
      await this.prisma.student.update({
        where: { id: student.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const setupIntent = await this.stripe.setupIntents.create(
      {
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      },
      { idempotencyKey: idempotencyKey(student.id, 'setup-intent') },
    );

    return {
      clientSecret: setupIntent.client_secret as string,
      customerId,
    };
  }

  async attachPaymentMethod(
    studentId: string,
    dto: AttachPaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { stripeCustomerId: true },
    });
    if (!student?.stripeCustomerId) {
      throw new BadRequestException(
        'Call POST /payments-stripe/setup-intent first to create a Stripe customer',
      );
    }

    await this.stripe.paymentMethods.attach(
      dto.stripePaymentMethodId,
      { customer: student.stripeCustomerId },
      { idempotencyKey: idempotencyKey(dto.stripePaymentMethodId, 'attach-payment-method') },
    );

    const pm = await this.stripe.paymentMethods.retrieve(
      dto.stripePaymentMethodId,
    );
    if (!pm.card) {
      throw new BadRequestException('Only card payment methods are supported');
    }

    const existing = await this.prisma.paymentMethod.findMany({
      where: { studentId, isDeleted: false },
    });
    const isDefault = existing.length === 0;

    const row = await this.prisma.paymentMethod.create({
      data: {
        studentId,
        stripePaymentMethodId: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        cardholderName: pm.billing_details?.name ?? 'UNKNOWN',
        expiryMonth: String(pm.card.exp_month).padStart(2, '0'),
        expiryYear: String(pm.card.exp_year),
        isDefault,
      },
    });
    return row as unknown as PaymentMethodResponseDto;
  }

  async detachPaymentMethod(studentId: string, rowId: string): Promise<void> {
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id: rowId, studentId, isDeleted: false },
    });
    if (!pm) throw new NotFoundException('Payment method not found');

    await this.stripe.paymentMethods.detach(
      pm.stripePaymentMethodId,
      { idempotencyKey: idempotencyKey(pm.stripePaymentMethodId, 'detach-payment-method') },
    );
    await this.prisma.paymentMethod.update({
      where: { id: rowId },
      data: { isDeleted: true, isDefault: false },
    });
  }
}
```

- [ ] **Step 3.4: Rodar testes**

```bash
npm test -- payments-stripe.service
```

Esperado: 6 testes passando (setup x2, attach x2, detach x2).

- [ ] **Step 3.5: Commit**

```bash
git add src/modules/payments-stripe/dto/ src/modules/payments-stripe/payments-stripe.service.ts src/modules/payments-stripe/payments-stripe.service.spec.ts
git commit -m "feat(payments-stripe): setupIntent + attach/detach payment methods com idempotência"
```

---

## Task 4: Charge flow (PaymentIntent + HELD) com TDD

**Files:**

- Create: `src/modules/payments-stripe/dto/charge.dto.ts`
- Modify: `src/modules/payments-stripe/payments-stripe.service.ts`
- Modify: `src/modules/payments-stripe/payments-stripe.service.spec.ts`

- [ ] **Step 4.1: DTO**

```typescript
// src/modules/payments-stripe/dto/charge.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChargeDto {
  @ApiProperty()
  @IsString()
  lessonId!: string;

  @ApiProperty()
  @IsString()
  paymentMethodId!: string;
}
```

- [ ] **Step 4.2: Adicionar testes do `charge()`**

Acrescentar ao `payments-stripe.service.spec.ts` (dentro do mesmo describe):

```typescript
describe('charge', () => {
  it('creates PaymentIntent with destination charge and persists Payment.status=PENDING', async () => {
    prisma.lesson.findUnique.mockResolvedValue({
      id: 'lsn-1',
      studentId: 'stu-1',
      instructorId: 'inst-1',
      price: 120,
    });
    prisma.paymentMethod.findFirst.mockResolvedValue({
      id: 'pm-row-1',
      studentId: 'stu-1',
      stripePaymentMethodId: 'pm_1Q',
      isDeleted: false,
    });
    prisma.student.findUnique.mockResolvedValue({
      id: 'stu-1',
      stripeCustomerId: 'cus_EXISTING',
    });
    prisma.instructor.findUnique.mockResolvedValue({
      id: 'inst-1',
      stripeAccountId: 'acct_INST',
      stripeAccountStatus: 'ACTIVE',
      stripePayoutsEnabled: true,
    });
    prisma.payment.findFirst.mockResolvedValue(null);
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_ABCD',
      status: 'requires_capture', // or 'succeeded'
    });
    prisma.payment.create.mockResolvedValue({
      id: 'pay-1',
      stripePaymentIntentId: 'pi_ABCD',
      status: 'PENDING',
      lessonId: 'lsn-1',
      amount: 120,
    });

    const r = await service.charge('stu-1', {
      lessonId: 'lsn-1',
      paymentMethodId: 'pm-row-1',
    });
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 12000, // BRL cents
        currency: 'brl',
        customer: 'cus_EXISTING',
        payment_method: 'pm_1Q',
        confirm: true,
        off_session: true,
        metadata: expect.objectContaining({
          lessonId: 'lsn-1',
          studentId: 'stu-1',
        }),
      }),
      { idempotencyKey: expect.any(String) },
    );
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripePaymentIntentId: 'pi_ABCD',
          status: 'PENDING',
          amount: 120,
          lessonId: 'lsn-1',
        }),
      }),
    );
    expect(r.status).toBe('PENDING');
  });

  it('rejects when instructor stripeAccountStatus != ACTIVE', async () => {
    prisma.lesson.findUnique.mockResolvedValue({
      id: 'lsn-1',
      studentId: 'stu-1',
      instructorId: 'inst-1',
      price: 120,
    });
    prisma.paymentMethod.findFirst.mockResolvedValue({
      id: 'pm-row-1',
      studentId: 'stu-1',
      stripePaymentMethodId: 'pm_1Q',
      isDeleted: false,
    });
    prisma.student.findUnique.mockResolvedValue({
      stripeCustomerId: 'cus_EXISTING',
    });
    prisma.instructor.findUnique.mockResolvedValue({
      id: 'inst-1',
      stripeAccountStatus: 'PENDING',
    });
    await expect(
      service.charge('stu-1', { lessonId: 'lsn-1', paymentMethodId: 'pm-row-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns existing payment when a charge for the same lesson already exists (idempotent)', async () => {
    prisma.lesson.findUnique.mockResolvedValue({
      id: 'lsn-1',
      studentId: 'stu-1',
      instructorId: 'inst-1',
      price: 120,
    });
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-existing',
      lessonId: 'lsn-1',
      status: 'HELD',
      stripePaymentIntentId: 'pi_EXISTING',
    });
    const r = await service.charge('stu-1', {
      lessonId: 'lsn-1',
      paymentMethodId: 'pm-row-1',
    });
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(r.id).toBe('pay-existing');
  });
});
```

- [ ] **Step 4.3: Implementar `charge()` no service**

Adicionar à classe `PaymentsStripeService`:

```typescript
async charge(
  studentId: string,
  dto: { lessonId: string; paymentMethodId: string },
) {
  const lesson = await this.prisma.lesson.findUnique({
    where: { id: dto.lessonId },
  });
  if (!lesson) throw new NotFoundException('Lesson not found');
  if (lesson.studentId !== studentId) {
    throw new BadRequestException('Lesson does not belong to this student');
  }

  const existing = await this.prisma.payment.findFirst({
    where: { lessonId: dto.lessonId },
  });
  if (existing) {
    this.logger.log(
      `Lesson ${dto.lessonId} already has Payment ${existing.id} (${existing.status}) — returning idempotently`,
    );
    return existing;
  }

  const pm = await this.prisma.paymentMethod.findFirst({
    where: { id: dto.paymentMethodId, studentId, isDeleted: false },
  });
  if (!pm) throw new NotFoundException('Payment method not found');

  const student = await this.prisma.student.findUnique({
    where: { id: studentId },
    select: { stripeCustomerId: true },
  });
  if (!student?.stripeCustomerId) {
    throw new BadRequestException(
      'Student has no Stripe customer — call /setup-intent first',
    );
  }

  const instructor = await this.prisma.instructor.findUnique({
    where: { id: lesson.instructorId },
  });
  if (!instructor) throw new BadRequestException('Instructor not found');
  if (instructor.stripeAccountStatus !== 'ACTIVE') {
    throw new BadRequestException(
      `Instructor Stripe Connect status is ${instructor.stripeAccountStatus} — charges only allowed for ACTIVE`,
    );
  }

  const amount = Math.round((lesson.price ?? 0) * 100);
  const pi = await this.stripe.paymentIntents.create(
    {
      amount,
      currency: 'brl',
      customer: student.stripeCustomerId,
      payment_method: pm.stripePaymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        lessonId: lesson.id,
        studentId,
        instructorId: instructor.id,
      },
      description: `Aula ${lesson.id}`,
    },
    { idempotencyKey: idempotencyKey(dto.lessonId, 'charge') },
  );

  const payment = await this.prisma.payment.create({
    data: {
      studentId,
      lessonId: lesson.id,
      paymentMethodId: pm.id,
      amount: lesson.price ?? 0,
      stripePaymentIntentId: pi.id,
      status: pi.status === 'succeeded' ? 'HELD' : 'PENDING',
    },
  });
  return payment;
}
```

(Campo `Lesson.price` é assumido — confirmar no schema atual. Se o nome for outro — ex. `lessonPrice` ou via `Instructor.hourlyRate` — adaptar e propagar para o teste.)

- [ ] **Step 4.4: Rodar testes**

```bash
npm test -- payments-stripe.service
```

Esperado: total 9 testes (6 originais + 3 do charge).

- [ ] **Step 4.5: Commit**

```bash
git add src/modules/payments-stripe/dto/charge.dto.ts src/modules/payments-stripe/payments-stripe.service.ts src/modules/payments-stripe/payments-stripe.service.spec.ts
git commit -m "feat(payments-stripe): charge com PaymentIntent off-session + idempotência por lessonId"
```

---

## Task 5: Release escrow + dispute resolution (TDD)

**Files:**

- Create: `src/modules/payments-stripe/dto/resolve-dispute.dto.ts`
- Modify: `src/modules/payments-stripe/payments-stripe.service.ts`
- Modify: `src/modules/payments-stripe/payments-stripe.service.spec.ts`

- [ ] **Step 5.1: DTO**

```typescript
// src/modules/payments-stripe/dto/resolve-dispute.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['release', 'refund'] })
  @IsIn(['release', 'refund'])
  action!: 'release' | 'refund';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
```

- [ ] **Step 5.2: Testes (TDD)**

```typescript
describe('releaseEscrow', () => {
  it('creates transfer to instructor Stripe account and marks Payment.status=RELEASED', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      lessonId: 'lsn-1',
      amount: 120,
      status: 'HELD',
      stripePaymentIntentId: 'pi_ABCD',
    });
    prisma.lesson.findUnique.mockResolvedValue({
      id: 'lsn-1',
      instructorId: 'inst-1',
      status: 'completed',
      durationMinutes: 60,
      biometryStartStatus: 'SUCCESS',
      biometryMidStatus: 'SUCCESS',
      biometryEndStatus: 'SUCCESS',
      integrityHash: 'h',
      disputeOpened: false,
    });
    prisma.instructor.findUnique.mockResolvedValue({
      id: 'inst-1',
      stripeAccountId: 'acct_INST',
    });
    stripe.transfers.create.mockResolvedValue({ id: 'tr_XYZ' });
    prisma.payment.update.mockResolvedValue({});
    await service.releaseEscrow('lsn-1');
    expect(stripe.transfers.create).toHaveBeenCalledWith(
      {
        amount: 12000,
        currency: 'brl',
        destination: 'acct_INST',
        transfer_group: 'lsn-1',
        metadata: { lessonId: 'lsn-1', paymentId: 'pay-1' },
      },
      { idempotencyKey: expect.any(String) },
    );
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { status: 'RELEASED', stripeTransferId: 'tr_XYZ' },
    });
  });

  it('does NOT release when lesson fails isValidForCompliance', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      lessonId: 'lsn-1',
      status: 'HELD',
      stripePaymentIntentId: 'pi_ABCD',
    });
    prisma.lesson.findUnique.mockResolvedValue({
      id: 'lsn-1',
      status: 'completed',
      durationMinutes: 30, // too short
      biometryStartStatus: 'SUCCESS',
      biometryMidStatus: 'SUCCESS',
      biometryEndStatus: 'SUCCESS',
      integrityHash: 'h',
      disputeOpened: false,
    });
    await expect(service.releaseEscrow('lsn-1')).rejects.toThrow(
      /does not meet compliance/i,
    );
    expect(stripe.transfers.create).not.toHaveBeenCalled();
  });

  it('is idempotent — already-RELEASED payment short-circuits', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      lessonId: 'lsn-1',
      status: 'RELEASED',
      stripeTransferId: 'tr_OLD',
    });
    await service.releaseEscrow('lsn-1');
    expect(stripe.transfers.create).not.toHaveBeenCalled();
  });
});

describe('resolveDispute', () => {
  it('action=release calls releaseEscrow flow', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      lessonId: 'lsn-1',
      amount: 120,
      status: 'HELD',
      stripePaymentIntentId: 'pi_ABCD',
    });
    prisma.lesson.findUnique.mockResolvedValue({
      id: 'lsn-1',
      instructorId: 'inst-1',
      status: 'completed',
      durationMinutes: 60,
      biometryStartStatus: 'SUCCESS',
      biometryMidStatus: 'SUCCESS',
      biometryEndStatus: 'SUCCESS',
      integrityHash: 'h',
      disputeOpened: true, // dispute open, but admin force-releases
    });
    prisma.instructor.findUnique.mockResolvedValue({
      id: 'inst-1',
      stripeAccountId: 'acct_INST',
    });
    stripe.transfers.create.mockResolvedValue({ id: 'tr_RES' });
    prisma.lesson.findUnique
      .mockResolvedValueOnce({
        id: 'lsn-1',
        instructorId: 'inst-1',
        status: 'completed',
        durationMinutes: 60,
        biometryStartStatus: 'SUCCESS',
        biometryMidStatus: 'SUCCESS',
        biometryEndStatus: 'SUCCESS',
        integrityHash: 'h',
        disputeOpened: true,
      });
    await service.resolveDispute('lsn-1', { action: 'release', reason: 'admin override' });
    expect(stripe.transfers.create).toHaveBeenCalled();
  });

  it('action=refund creates refund and marks Payment.status=REFUNDED', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      lessonId: 'lsn-1',
      status: 'HELD',
      stripePaymentIntentId: 'pi_ABCD',
    });
    stripe.refunds.create.mockResolvedValue({ id: 're_XYZ' });
    prisma.payment.update.mockResolvedValue({});
    await service.resolveDispute('lsn-1', { action: 'refund', reason: 'fraud' });
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      {
        payment_intent: 'pi_ABCD',
        reason: 'requested_by_customer',
        metadata: { lessonId: 'lsn-1', resolution: 'refund', reason: 'fraud' },
      },
      { idempotencyKey: expect.any(String) },
    );
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { status: 'REFUNDED', stripeRefundId: 're_XYZ' },
    });
  });
});
```

- [ ] **Step 5.3: Implementar release + dispute no service**

```typescript
// Add to PaymentsStripeService:

private isValidForCompliance(lesson: any): boolean {
  return (
    lesson.status === 'completed' &&
    (lesson.durationMinutes ?? 0) >= 50 &&
    lesson.biometryStartStatus === 'SUCCESS' &&
    lesson.biometryMidStatus === 'SUCCESS' &&
    lesson.biometryEndStatus === 'SUCCESS' &&
    lesson.integrityHash !== null &&
    lesson.disputeOpened === false
  );
}

async releaseEscrow(lessonId: string): Promise<void> {
  const payment = await this.prisma.payment.findFirst({
    where: { lessonId },
  });
  if (!payment) throw new NotFoundException(`No payment for lesson ${lessonId}`);
  if (payment.status === 'RELEASED') {
    this.logger.log(`Payment ${payment.id} already RELEASED — skipping`);
    return;
  }
  if (payment.status !== 'HELD') {
    throw new BadRequestException(
      `Payment is in status ${payment.status} — only HELD can be released`,
    );
  }

  const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new NotFoundException('Lesson not found');
  if (!this.isValidForCompliance(lesson)) {
    throw new BadRequestException(
      'Lesson does not meet compliance — cannot release escrow',
    );
  }

  const instructor = await this.prisma.instructor.findUnique({
    where: { id: lesson.instructorId },
  });
  if (!instructor?.stripeAccountId) {
    throw new BadRequestException('Instructor has no Stripe account');
  }

  const transfer = await this.stripe.transfers.create(
    {
      amount: Math.round((payment.amount ?? 0) * 100),
      currency: 'brl',
      destination: instructor.stripeAccountId,
      transfer_group: lesson.id,
      metadata: { lessonId: lesson.id, paymentId: payment.id },
    },
    { idempotencyKey: idempotencyKey(payment.id, 'release') },
  );

  await this.prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'RELEASED', stripeTransferId: transfer.id },
  });
}

async resolveDispute(
  lessonId: string,
  dto: { action: 'release' | 'refund'; reason?: string },
): Promise<void> {
  const payment = await this.prisma.payment.findFirst({
    where: { lessonId },
  });
  if (!payment) throw new NotFoundException(`No payment for lesson ${lessonId}`);

  if (dto.action === 'release') {
    // Admin override of compliance check — same flow as releaseEscrow but
    // tolerating disputeOpened=true. We re-execute the Stripe transfer here.
    if (payment.status === 'RELEASED') return;
    if (payment.status !== 'HELD') {
      throw new BadRequestException(
        `Payment in status ${payment.status} cannot be released`,
      );
    }
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: lesson?.instructorId ?? '' },
    });
    if (!instructor?.stripeAccountId) {
      throw new BadRequestException('Instructor has no Stripe account');
    }
    const transfer = await this.stripe.transfers.create(
      {
        amount: Math.round((payment.amount ?? 0) * 100),
        currency: 'brl',
        destination: instructor.stripeAccountId,
        transfer_group: lessonId,
        metadata: {
          lessonId,
          paymentId: payment.id,
          resolution: 'release',
          reason: dto.reason ?? '',
        },
      },
      { idempotencyKey: idempotencyKey(payment.id, 'release') },
    );
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'RELEASED', stripeTransferId: transfer.id },
    });
    return;
  }

  // refund
  if (payment.status === 'REFUNDED') return;
  if (!payment.stripePaymentIntentId) {
    throw new BadRequestException('Payment has no PaymentIntent to refund');
  }
  const refund = await this.stripe.refunds.create(
    {
      payment_intent: payment.stripePaymentIntentId,
      reason: 'requested_by_customer',
      metadata: { lessonId, resolution: 'refund', reason: dto.reason ?? '' },
    },
    { idempotencyKey: idempotencyKey(payment.id, 'refund') },
  );
  await this.prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'REFUNDED', stripeRefundId: refund.id },
  });
}
```

- [ ] **Step 5.4: Rodar testes**

```bash
npm test -- payments-stripe.service
```

Esperado: total 14 testes (9 anteriores + 5 do release/dispute).

- [ ] **Step 5.5: Commit**

```bash
git add src/modules/payments-stripe/dto/resolve-dispute.dto.ts src/modules/payments-stripe/payments-stripe.service.ts src/modules/payments-stripe/payments-stripe.service.spec.ts
git commit -m "feat(payments-stripe): releaseEscrow + resolveDispute com compliance gate e idempotência"
```

---

## Task 6: `StripeConnectService` — onboarding de instrutor (TDD)

**Files:**

- Create: `src/modules/payments-stripe/dto/connect-status.dto.ts`
- Create: `src/modules/payments-stripe/stripe-connect.service.ts`
- Create: `src/modules/payments-stripe/stripe-connect.service.spec.ts`

- [ ] **Step 6.1: DTO**

```typescript
// src/modules/payments-stripe/dto/connect-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ConnectStatusDto {
  @ApiProperty({ required: false, nullable: true })
  stripeAccountId!: string | null;

  @ApiProperty({ enum: ['PENDING', 'ONBOARDING', 'ACTIVE', 'RESTRICTED'] })
  stripeAccountStatus!: string;

  @ApiProperty()
  stripePayoutsEnabled!: boolean;
}

export class ConnectOnboardResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  expiresAt!: number;
}
```

- [ ] **Step 6.2: Testes (TDD)**

```typescript
// src/modules/payments-stripe/stripe-connect.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StripeConnectService } from './stripe-connect.service';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from './stripe.client';
import { ConfigService } from '@nestjs/config';

describe('StripeConnectService', () => {
  let service: StripeConnectService;
  let prisma: any;
  let stripe: any;

  beforeEach(async () => {
    prisma = { instructor: { findUnique: jest.fn(), update: jest.fn() } };
    stripe = {
      accounts: { create: jest.fn(), retrieve: jest.fn() },
      accountLinks: { create: jest.fn() },
    };
    const config = {
      get: (k: string) => {
        if (k === 'STRIPE_CONNECT_REFRESH_URL') return 'http://localhost/refresh';
        if (k === 'STRIPE_CONNECT_RETURN_URL') return 'http://localhost/return';
        return undefined;
      },
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        StripeConnectService,
        { provide: PrismaService, useValue: prisma },
        { provide: STRIPE_CLIENT, useValue: stripe },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = mod.get(StripeConnectService);
  });

  describe('startOnboarding', () => {
    it('creates an Express account on first call and persists stripeAccountId', async () => {
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        email: 'r@b.com',
        stripeAccountId: null,
      });
      stripe.accounts.create.mockResolvedValue({ id: 'acct_NEW' });
      stripe.accountLinks.create.mockResolvedValue({
        url: 'https://connect.stripe.com/setup/...',
        expires_at: 1700000000,
      });
      const r = await service.startOnboarding('inst-1');
      expect(stripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'express',
          country: 'BR',
          email: 'r@b.com',
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
        }),
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.instructor.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: {
          stripeAccountId: 'acct_NEW',
          stripeAccountStatus: 'ONBOARDING',
        },
      });
      expect(r.url).toMatch(/connect\.stripe\.com/);
    });

    it('reuses account when stripeAccountId already exists', async () => {
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        email: 'r@b.com',
        stripeAccountId: 'acct_EXISTING',
        stripeAccountStatus: 'ONBOARDING',
      });
      stripe.accountLinks.create.mockResolvedValue({
        url: 'https://connect.stripe.com/setup/x',
        expires_at: 1700000000,
      });
      await service.startOnboarding('inst-1');
      expect(stripe.accounts.create).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('returns the cached status from Instructor row', async () => {
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        stripeAccountId: 'acct_X',
        stripeAccountStatus: 'ACTIVE',
        stripePayoutsEnabled: true,
      });
      const r = await service.getStatus('inst-1');
      expect(r.stripeAccountStatus).toBe('ACTIVE');
      expect(r.stripePayoutsEnabled).toBe(true);
    });

    it('throws NotFoundException when instructor does not exist', async () => {
      prisma.instructor.findUnique.mockResolvedValue(null);
      await expect(service.getStatus('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAccountStatus', () => {
    it('maps payouts_enabled=true + charges_enabled=true to ACTIVE', async () => {
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        stripeAccountId: 'acct_X',
      });
      prisma.instructor.update.mockResolvedValue({});
      await service.updateAccountStatus('acct_X', {
        payouts_enabled: true,
        charges_enabled: true,
        requirements: { disabled_reason: null },
      });
      expect(prisma.instructor.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: {
          stripeAccountStatus: 'ACTIVE',
          stripePayoutsEnabled: true,
        },
      });
    });

    it('maps disabled_reason set to RESTRICTED', async () => {
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        stripeAccountId: 'acct_X',
      });
      prisma.instructor.update.mockResolvedValue({});
      await service.updateAccountStatus('acct_X', {
        payouts_enabled: false,
        charges_enabled: false,
        requirements: { disabled_reason: 'rejected.terms_of_service' },
      });
      expect(prisma.instructor.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: {
          stripeAccountStatus: 'RESTRICTED',
          stripePayoutsEnabled: false,
        },
      });
    });
  });
});
```

- [ ] **Step 6.3: Implementar `stripe-connect.service.ts`**

```typescript
// src/modules/payments-stripe/stripe-connect.service.ts
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from './stripe.client';
import { idempotencyKey } from './lib/idempotency';
import {
  ConnectOnboardResponseDto,
  ConnectStatusDto,
} from './dto/connect-status.dto';

interface StripeAccountSnapshot {
  payouts_enabled: boolean;
  charges_enabled: boolean;
  requirements?: { disabled_reason?: string | null };
}

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly config: ConfigService,
  ) {}

  async startOnboarding(instructorId: string): Promise<ConnectOnboardResponseDto> {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: instructorId },
      select: { id: true, email: true, stripeAccountId: true },
    });
    if (!instructor) throw new NotFoundException('Instructor not found');

    let accountId = instructor.stripeAccountId;
    if (!accountId) {
      const account = await this.stripe.accounts.create(
        {
          type: 'express',
          country: 'BR',
          email: instructor.email,
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          metadata: { instructorId },
        },
        { idempotencyKey: idempotencyKey(instructorId, 'connect-account') },
      );
      accountId = account.id;
      await this.prisma.instructor.update({
        where: { id: instructorId },
        data: {
          stripeAccountId: accountId,
          stripeAccountStatus: 'ONBOARDING',
        },
      });
    }

    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url:
        this.config.get<string>('STRIPE_CONNECT_REFRESH_URL') ??
        'http://localhost:3001/api/v1/payments-stripe/connect/refresh',
      return_url:
        this.config.get<string>('STRIPE_CONNECT_RETURN_URL') ??
        'http://localhost:3001/api/v1/payments-stripe/connect/return',
      type: 'account_onboarding',
    });
    return { url: link.url, expiresAt: link.expires_at };
  }

  async getStatus(instructorId: string): Promise<ConnectStatusDto> {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: instructorId },
      select: {
        stripeAccountId: true,
        stripeAccountStatus: true,
        stripePayoutsEnabled: true,
      },
    });
    if (!instructor) throw new NotFoundException('Instructor not found');
    return {
      stripeAccountId: instructor.stripeAccountId,
      stripeAccountStatus: instructor.stripeAccountStatus,
      stripePayoutsEnabled: instructor.stripePayoutsEnabled,
    };
  }

  async updateAccountStatus(
    stripeAccountId: string,
    snapshot: StripeAccountSnapshot,
  ): Promise<void> {
    const instructor = await this.prisma.instructor.findUnique({
      where: { stripeAccountId },
      select: { id: true },
    });
    if (!instructor) {
      this.logger.warn(
        `No instructor found for stripeAccountId=${stripeAccountId} — ignoring webhook`,
      );
      return;
    }
    const disabled = snapshot.requirements?.disabled_reason ?? null;
    let status: 'ACTIVE' | 'ONBOARDING' | 'RESTRICTED';
    if (disabled) status = 'RESTRICTED';
    else if (snapshot.payouts_enabled && snapshot.charges_enabled) status = 'ACTIVE';
    else status = 'ONBOARDING';

    await this.prisma.instructor.update({
      where: { id: instructor.id },
      data: {
        stripeAccountStatus: status,
        stripePayoutsEnabled: !!snapshot.payouts_enabled,
      },
    });
  }
}
```

- [ ] **Step 6.4: Rodar testes**

```bash
npm test -- stripe-connect.service
```

Esperado: 5 testes passando.

- [ ] **Step 6.5: Commit**

```bash
git add src/modules/payments-stripe/dto/connect-status.dto.ts src/modules/payments-stripe/stripe-connect.service.ts src/modules/payments-stripe/stripe-connect.service.spec.ts
git commit -m "feat(payments-stripe): Stripe Connect onboarding e mapeamento de status (Express account)"
```

---

## Task 7: Event router + `StripeWebhooksController` (TDD)

**Files:**

- Create: `src/modules/payments-stripe/lib/event-router.ts`
- Create: `src/modules/payments-stripe/lib/event-router.spec.ts`
- Create: `src/modules/payments-stripe/stripe-webhooks.controller.ts`
- Create: `src/modules/payments-stripe/stripe-webhooks.controller.spec.ts`

- [ ] **Step 7.1: Testes da função pura `routeStripeEvent`**

```typescript
// src/modules/payments-stripe/lib/event-router.spec.ts
import { routeStripeEvent } from './event-router';

describe('routeStripeEvent', () => {
  const handlers = {
    onPaymentIntentSucceeded: jest.fn(),
    onPaymentIntentFailed: jest.fn(),
    onAccountUpdated: jest.fn(),
    onTransferCreated: jest.fn(),
    onTransferFailed: jest.fn(),
  };

  beforeEach(() => {
    Object.values(handlers).forEach((h) => h.mockReset());
  });

  it('routes payment_intent.succeeded', async () => {
    await routeStripeEvent(
      { type: 'payment_intent.succeeded', data: { object: { id: 'pi_1' } } } as any,
      handlers,
    );
    expect(handlers.onPaymentIntentSucceeded).toHaveBeenCalledWith({ id: 'pi_1' });
  });

  it('routes payment_intent.payment_failed', async () => {
    await routeStripeEvent(
      {
        type: 'payment_intent.payment_failed',
        data: {
          object: { id: 'pi_2', last_payment_error: { message: 'no funds' } },
        },
      } as any,
      handlers,
    );
    expect(handlers.onPaymentIntentFailed).toHaveBeenCalled();
  });

  it('routes account.updated', async () => {
    await routeStripeEvent(
      { type: 'account.updated', data: { object: { id: 'acct_1' } } } as any,
      handlers,
    );
    expect(handlers.onAccountUpdated).toHaveBeenCalled();
  });

  it('routes transfer.created and transfer.failed', async () => {
    await routeStripeEvent(
      { type: 'transfer.created', data: { object: { id: 'tr_1' } } } as any,
      handlers,
    );
    await routeStripeEvent(
      { type: 'transfer.failed', data: { object: { id: 'tr_2' } } } as any,
      handlers,
    );
    expect(handlers.onTransferCreated).toHaveBeenCalled();
    expect(handlers.onTransferFailed).toHaveBeenCalled();
  });

  it('returns false (ignored) for unknown event types', async () => {
    const handled = await routeStripeEvent(
      { type: 'unhandled.foo', data: { object: {} } } as any,
      handlers,
    );
    expect(handled).toBe(false);
  });
});
```

- [ ] **Step 7.2: Implementar `event-router.ts`**

```typescript
// src/modules/payments-stripe/lib/event-router.ts
import type Stripe from 'stripe';

export interface StripeEventHandlers {
  onPaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void>;
  onPaymentIntentFailed(pi: Stripe.PaymentIntent): Promise<void>;
  onAccountUpdated(account: Stripe.Account): Promise<void>;
  onTransferCreated(transfer: Stripe.Transfer): Promise<void>;
  onTransferFailed(transfer: Stripe.Transfer): Promise<void>;
}

export async function routeStripeEvent(
  event: Stripe.Event,
  handlers: StripeEventHandlers,
): Promise<boolean> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlers.onPaymentIntentSucceeded(
        event.data.object as Stripe.PaymentIntent,
      );
      return true;
    case 'payment_intent.payment_failed':
      await handlers.onPaymentIntentFailed(
        event.data.object as Stripe.PaymentIntent,
      );
      return true;
    case 'account.updated':
      await handlers.onAccountUpdated(event.data.object as Stripe.Account);
      return true;
    case 'transfer.created':
      await handlers.onTransferCreated(event.data.object as Stripe.Transfer);
      return true;
    case 'transfer.failed':
      await handlers.onTransferFailed(event.data.object as Stripe.Transfer);
      return true;
    default:
      return false;
  }
}
```

- [ ] **Step 7.3: Testes do controller (TDD)**

```typescript
// src/modules/payments-stripe/stripe-webhooks.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StripeWebhooksController } from './stripe-webhooks.controller';
import { PaymentsStripeService } from './payments-stripe.service';
import { StripeConnectService } from './stripe-connect.service';
import { STRIPE_CLIENT } from './stripe.client';
import { ConfigService } from '@nestjs/config';

describe('StripeWebhooksController', () => {
  let controller: StripeWebhooksController;
  let stripe: any;
  let payments: any;
  let connect: any;

  beforeEach(async () => {
    stripe = { webhooks: { constructEvent: jest.fn() } };
    payments = {
      handlePaymentIntentSucceeded: jest.fn(),
      handlePaymentIntentFailed: jest.fn(),
      handleTransferCreated: jest.fn(),
      handleTransferFailed: jest.fn(),
    };
    connect = { updateAccountStatus: jest.fn() };

    const mod: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhooksController],
      providers: [
        { provide: PaymentsStripeService, useValue: payments },
        { provide: StripeConnectService, useValue: connect },
        { provide: STRIPE_CLIENT, useValue: stripe },
        {
          provide: ConfigService,
          useValue: { get: () => 'whsec_test' },
        },
      ],
    }).compile();
    controller = mod.get(StripeWebhooksController);
  });

  it('rejects 400 when signature header is missing', async () => {
    await expect(
      controller.handle({ rawBody: Buffer.from('') } as any, ''),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects 400 when constructEvent throws (bad signature)', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    await expect(
      controller.handle(
        { rawBody: Buffer.from('{}') } as any,
        't=1,v1=bad',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('routes payment_intent.succeeded to payments service', async () => {
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1' } },
    });
    const res = await controller.handle(
      { rawBody: Buffer.from('{}') } as any,
      'sig',
    );
    expect(payments.handlePaymentIntentSucceeded).toHaveBeenCalledWith({ id: 'pi_1' });
    expect(res).toEqual({ received: true });
  });

  it('routes account.updated to connect service', async () => {
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'account.updated',
      data: {
        object: {
          id: 'acct_1',
          payouts_enabled: true,
          charges_enabled: true,
          requirements: { disabled_reason: null },
        },
      },
    });
    await controller.handle({ rawBody: Buffer.from('{}') } as any, 'sig');
    expect(connect.updateAccountStatus).toHaveBeenCalledWith('acct_1', {
      payouts_enabled: true,
      charges_enabled: true,
      requirements: { disabled_reason: null },
    });
  });

  it('returns received=true for unhandled event types', async () => {
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'unhandled.foo',
      data: { object: {} },
    });
    const r = await controller.handle(
      { rawBody: Buffer.from('{}') } as any,
      'sig',
    );
    expect(r).toEqual({ received: true });
  });
});
```

- [ ] **Step 7.4: Implementar `stripe-webhooks.controller.ts`**

```typescript
// src/modules/payments-stripe/stripe-webhooks.controller.ts
import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import type { Request } from 'express';
import { STRIPE_CLIENT } from './stripe.client';
import { PaymentsStripeService } from './payments-stripe.service';
import { StripeConnectService } from './stripe-connect.service';
import { routeStripeEvent } from './lib/event-router';

interface RequestWithRaw extends Request {
  rawBody?: Buffer;
}

@ApiExcludeController()
@Controller('webhooks/stripe')
export class StripeWebhooksController {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly payments: PaymentsStripeService,
    private readonly connect: StripeConnectService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RequestWithRaw,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: true }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET not configured');
    }
    if (!req.rawBody) {
      throw new BadRequestException(
        'rawBody not available — check main.ts raw body middleware',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        secret,
      );
    } catch (e) {
      throw new BadRequestException(
        `Stripe signature verification failed: ${(e as Error).message}`,
      );
    }

    await routeStripeEvent(event, {
      onPaymentIntentSucceeded: (pi) =>
        this.payments.handlePaymentIntentSucceeded(pi),
      onPaymentIntentFailed: (pi) => this.payments.handlePaymentIntentFailed(pi),
      onAccountUpdated: (account) =>
        this.connect.updateAccountStatus(account.id, {
          payouts_enabled: account.payouts_enabled,
          charges_enabled: account.charges_enabled,
          requirements: account.requirements
            ? { disabled_reason: account.requirements.disabled_reason ?? null }
            : { disabled_reason: null },
        }),
      onTransferCreated: (transfer) =>
        this.payments.handleTransferCreated(transfer),
      onTransferFailed: (transfer) =>
        this.payments.handleTransferFailed(transfer),
    });

    return { received: true };
  }
}
```

E adicionar os 4 handlers de webhook ao `PaymentsStripeService`:

```typescript
// PaymentsStripeService — handlers acionados pelo webhook controller
async handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  await this.prisma.payment.updateMany({
    where: { stripePaymentIntentId: pi.id, status: { in: ['PENDING'] } },
    data: { status: 'HELD' },
  });
}

async handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  await this.prisma.payment.updateMany({
    where: { stripePaymentIntentId: pi.id },
    data: {
      status: 'FAILED',
      failureReason: pi.last_payment_error?.message ?? 'unknown',
    },
  });
}

async handleTransferCreated(transfer: Stripe.Transfer) {
  // Already updated to RELEASED in releaseEscrow; this is just a confirmation.
  this.logger.log(
    `Webhook transfer.created received for ${transfer.id} — RELEASED already persisted`,
  );
}

async handleTransferFailed(transfer: Stripe.Transfer) {
  await this.prisma.payment.updateMany({
    where: { stripeTransferId: transfer.id },
    data: { status: 'HELD' },
  });
  this.logger.error(`Transfer ${transfer.id} failed — Payment reverted to HELD`);
}
```

- [ ] **Step 7.5: Rodar testes**

```bash
npm test -- event-router stripe-webhooks
```

Esperado: 5 + 5 = 10 testes passando.

- [ ] **Step 7.6: Commit**

```bash
git add src/modules/payments-stripe/lib/event-router.ts src/modules/payments-stripe/lib/event-router.spec.ts src/modules/payments-stripe/stripe-webhooks.controller.ts src/modules/payments-stripe/stripe-webhooks.controller.spec.ts src/modules/payments-stripe/payments-stripe.service.ts
git commit -m "feat(payments-stripe): webhook controller com verificação HMAC + event router"
```

---

## Task 8: `PaymentsStripeController` + module + raw body parser

**Files:**

- Create: `src/modules/payments-stripe/payments-stripe.controller.ts`
- Create: `src/modules/payments-stripe/payments-stripe.module.ts`
- Modify: `src/main.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 8.1: Controller principal**

```typescript
// src/modules/payments-stripe/payments-stripe.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsStripeService } from './payments-stripe.service';
import { StripeConnectService } from './stripe-connect.service';
import { ChargeDto } from './dto/charge.dto';
import {
  AttachPaymentMethodDto,
  PaymentMethodResponseDto,
} from './dto/payment-method.dto';
import { SetupIntentResponseDto } from './dto/setup-intent-response.dto';
import {
  ConnectOnboardResponseDto,
  ConnectStatusDto,
} from './dto/connect-status.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser {
  user: { id: string; role?: string };
}

@ApiTags('payments-stripe')
@ApiBearerAuth()
@Controller('payments-stripe')
@UseGuards(JwtAuthGuard)
export class PaymentsStripeController {
  constructor(
    private readonly service: PaymentsStripeService,
    private readonly connect: StripeConnectService,
  ) {}

  @Post('setup-intent')
  @ApiOkResponse({ type: SetupIntentResponseDto })
  setupIntent(@Req() req: RequestWithUser) {
    return this.service.createSetupIntent(req.user.id);
  }

  @Post('payment-methods')
  @ApiOkResponse({ type: PaymentMethodResponseDto })
  attach(
    @Req() req: RequestWithUser,
    @Body() dto: AttachPaymentMethodDto,
  ) {
    return this.service.attachPaymentMethod(req.user.id, dto);
  }

  @Delete('payment-methods/:id')
  detach(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.service.detachPaymentMethod(req.user.id, id);
  }

  @Post('charge')
  charge(@Req() req: RequestWithUser, @Body() dto: ChargeDto) {
    return this.service.charge(req.user.id, dto);
  }

  @Get('me')
  getMyPayments(@Req() req: RequestWithUser) {
    return this.service.listMyPayments(req.user.id);
  }

  @Post('connect/onboard')
  @ApiOkResponse({ type: ConnectOnboardResponseDto })
  onboard(@Req() req: RequestWithUser) {
    // Endpoint is intended for instructors; role must be 'instructor'
    return this.connect.startOnboarding(req.user.id);
  }

  @Get('connect/status')
  @ApiOkResponse({ type: ConnectStatusDto })
  connectStatus(@Req() req: RequestWithUser) {
    return this.connect.getStatus(req.user.id);
  }

  @Post('disputes/:lessonId/resolve')
  resolveDispute(
    @Req() req: RequestWithUser,
    @Param('lessonId') lessonId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    if (req.user.role !== 'admin') {
      throw new (require('@nestjs/common').ForbiddenException)(
        'Only admin can resolve disputes',
      );
    }
    return this.service.resolveDispute(lessonId, dto);
  }
}
```

- [ ] **Step 8.2: Adicionar `listMyPayments` ao service**

```typescript
// PaymentsStripeService:
async listMyPayments(studentId: string) {
  return this.prisma.payment.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      status: true,
      lessonId: true,
      stripePaymentIntentId: true,
      stripeTransferId: true,
      stripeRefundId: true,
      createdAt: true,
    },
  });
}
```

- [ ] **Step 8.3: Module**

```typescript
// src/modules/payments-stripe/payments-stripe.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsStripeController } from './payments-stripe.controller';
import { PaymentsStripeService } from './payments-stripe.service';
import { StripeConnectService } from './stripe-connect.service';
import { StripeWebhooksController } from './stripe-webhooks.controller';
import { stripeClientProvider, StripeClientHolder } from './stripe.client';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ConfigModule, AuthModule],
  controllers: [PaymentsStripeController, StripeWebhooksController],
  providers: [
    PaymentsStripeService,
    StripeConnectService,
    StripeClientHolder,
    stripeClientProvider,
  ],
  exports: [PaymentsStripeService, StripeConnectService],
})
export class PaymentsStripeModule {}
```

- [ ] **Step 8.4: Configurar raw body parser em `main.ts`**

Em `src/main.ts`, antes de `app.listen(...)`:

```typescript
import { json, raw } from 'express';

// Stripe webhook precisa do raw body para verificar a assinatura HMAC
app.use(
  '/api/v1/webhooks/stripe',
  raw({ type: 'application/json' }),
  (req: any, _res: any, next: any) => {
    req.rawBody = req.body; // body é Buffer aqui
    next();
  },
);
// Demais rotas continuam com JSON parser padrão (já configurado pelo Nest)
```

A ordem importa: o middleware acima precisa vir antes de qualquer `bodyParser.json()` global. Se o projeto usa `express.json()` global em algum outro lugar, mover este antes.

- [ ] **Step 8.5: Substituir `PaymentsModule` por `PaymentsStripeModule` em `AppModule`**

Em `src/app.module.ts`:

```typescript
// Remover:
import { PaymentsModule } from './modules/payments/payments.module';

// Adicionar:
import { PaymentsStripeModule } from './modules/payments-stripe/payments-stripe.module';

// imports[]: remover PaymentsModule, adicionar PaymentsStripeModule
```

- [ ] **Step 8.6: Build sanity-check**

```bash
npm run build
```

Esperado: build limpo (não precisa rodar — verificar warnings).

- [ ] **Step 8.7: Commit**

```bash
git add src/modules/payments-stripe/payments-stripe.controller.ts src/modules/payments-stripe/payments-stripe.module.ts src/modules/payments-stripe/payments-stripe.service.ts src/main.ts src/app.module.ts
git commit -m "feat(payments-stripe): controller + module + raw body parser em /webhooks/stripe"
```

---

## Task 9: Remover módulo `payments/` Asaas

**Files:**

- Delete: `src/modules/payments/` (pasta inteira)
- Modify: `src/modules/lessons/lessons.service.ts` — substitui `AsaasService` por `PaymentsStripeService`
- Modify: `src/modules/lessons/lessons.module.ts`
- Modify: `src/modules/payment-methods/payment-methods.service.ts` — refatora para usar campos Stripe

- [ ] **Step 9.1: Mapear callers de `AsaasService` e `EscrowService`**

```bash
grep -rn "AsaasService\|EscrowService\|asaas.service\|@asaas" src/ test/ 2>/dev/null
```

Esperado: aparecem em `lessons.service.ts`, `payment-methods.service.ts`, possivelmente em testes. Lista detalhada vai guiar a edição.

- [ ] **Step 9.2: Atualizar `lessons.service.ts`**

Em `src/modules/lessons/lessons.service.ts`, substituir:

```typescript
// Antes:
import { AsaasService } from '../payments/asaas.service';
// ...
constructor(
  private prisma: PrismaService,
  private shield: ShieldService,
  private asaasService: AsaasService,
  // ...
) {}
```

por:

```typescript
import { PaymentsStripeService } from '../payments-stripe/payments-stripe.service';
// ...
constructor(
  private prisma: PrismaService,
  private shield: ShieldService,
  private paymentsStripe: PaymentsStripeService,
  // ... (mantém Journey, Validation, ConfigService, DocumentValidationProvider do sub-plano anterior)
) {}
```

Localizar **todos** os usos de `this.asaasService.<algo>` no arquivo e substituir pelo equivalente Stripe (provavelmente apenas em `completeLesson()` para o release).

Em `completeLesson()` (procurar pelo método existente; o nome pode ser `complete` ou `updateStatus`):

```typescript
// dentro do final de completeLesson, após persistir status='completed':
try {
  await this.paymentsStripe.releaseEscrow(lessonId);
} catch (e) {
  this.logger.warn(
    `Escrow release skipped for lesson ${lessonId}: ${(e as Error).message}`,
  );
  // Não impede o complete da aula — release pode ser acionado manualmente pelo admin
}
```

- [ ] **Step 9.3: Atualizar `lessons.module.ts`**

```typescript
import { PaymentsStripeModule } from '../payments-stripe/payments-stripe.module';

@Module({
  imports: [
    PrismaModule,
    TelemetriaModule,
    PaymentsStripeModule, // substitui PaymentsModule
    JourneyModule,
    ValidationModule,
    AuthModule,
  ],
  // ...
})
export class LessonsModule {}
```

- [ ] **Step 9.4: Refatorar `payment-methods.service.ts`**

`PaymentMethodsService` deixa de criar tokens Asaas; a criação é delegada ao fluxo Stripe (frontend chama `/payments-stripe/setup-intent` → cria PM no Stripe → confirma o setup-intent → chama `/payments-stripe/payment-methods` para registrar localmente).

Manter no `PaymentMethodsService`:
- `findAll(studentId)` — lista com `isDeleted=false`
- `setDefault(studentId, id)`
- `findOne(id)` para lookups internos

Remover:
- Qualquer método `create()` que cria token Asaas
- Qualquer chamada a `asaasService`

Esqueleto refatorado:

```typescript
// src/modules/payment-methods/payment-methods.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(studentId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { studentId, isDeleted: false },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        stripePaymentMethodId: true,
        brand: true,
        last4: true,
        cardholderName: true,
        expiryMonth: true,
        expiryYear: true,
        isDefault: true,
      },
    });
  }

  async setDefault(studentId: string, id: string) {
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id, studentId, isDeleted: false },
    });
    if (!pm) throw new NotFoundException('Payment method not found');
    await this.prisma.$transaction([
      this.prisma.paymentMethod.updateMany({
        where: { studentId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.paymentMethod.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
    return { ok: true };
  }
}
```

Atualizar `payment-methods.controller.ts` para remover endpoint `POST` de criação local (a criação real agora é via Stripe controller). Manter `GET`, `PATCH /:id/default`, `DELETE /:id` — onde DELETE delega para `PaymentsStripeService.detachPaymentMethod`.

- [ ] **Step 9.5: Deletar a pasta `src/modules/payments/`**

```bash
rm -rf src/modules/payments/
```

Antes de deletar, conferir que **nenhum import remanescente** aponta para `../payments/*`:

```bash
grep -rn "from ['\"].*payments/" src/ test/ 2>/dev/null
```

Esperado: 0 ocorrências. Se aparecer algo, ajustar antes do `rm -rf`.

- [ ] **Step 9.6: Atualizar `lessons.service.spec.ts` e outros testes**

O spec do sub-plano `ladv-and-lesson-gate` (Task 5) já tinha um mock vazio para `AsaasService`. Substituir por `PaymentsStripeService`:

```typescript
// no providers[]:
{ provide: PaymentsStripeService, useValue: { releaseEscrow: jest.fn() } },
```

E remover qualquer `{ provide: AsaasService, ... }`.

Conferir outros specs com mesmo problema:

```bash
grep -rn "AsaasService" test/ src/ 2>/dev/null
```

Esperado: 0 ocorrências.

- [ ] **Step 9.7: Build + tests**

```bash
npm run build && npm test
```

Esperado: build limpo, todos os testes verdes.

- [ ] **Step 9.8: Commit**

```bash
git add -A src/modules/payments src/modules/payments-stripe src/modules/lessons src/modules/payment-methods
git commit -m "remove(payments): elimina módulo Asaas; lessons/payment-methods migrados para Stripe"
```

---

## Task 10: Filtro de instrutor por `stripeAccountStatus=ACTIVE`

**Files:**

- Modify: `src/modules/instructors/instructors.service.ts`
- Modify: `src/modules/instructors/instructors.service.spec.ts`

- [ ] **Step 10.1: Atualizar `findAll()` do `InstructorsService`**

Localizar o método `findAll()` (ou equivalente que alimenta `GET /instructors`) e adicionar filtros:

```typescript
async findAll() {
  return this.prisma.instructor.findMany({
    where: {
      credentialStatus: 'APPROVED',
      stripeAccountStatus: 'ACTIVE',
      isActive: true, // mantém check legado para CNH expirada
    },
    select: {
      id: true,
      name: true,
      email: true,
      cnh: true,
      // ... outros campos públicos
    },
  });
}
```

(Adaptar `select` aos campos atuais; não expor sensíveis como `password`.)

- [ ] **Step 10.2: Atualizar/adicionar testes**

```typescript
// src/modules/instructors/instructors.service.spec.ts
import { Test } from '@nestjs/testing';
import { InstructorsService } from './instructors.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InstructorsService.findAll', () => {
  let service: InstructorsService;
  let prisma: { instructor: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { instructor: { findMany: jest.fn() } };
    const mod = await Test.createTestingModule({
      providers: [
        InstructorsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = mod.get(InstructorsService);
  });

  it('filters by credentialStatus=APPROVED AND stripeAccountStatus=ACTIVE', async () => {
    prisma.instructor.findMany.mockResolvedValue([]);
    await service.findAll();
    expect(prisma.instructor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          credentialStatus: 'APPROVED',
          stripeAccountStatus: 'ACTIVE',
          isActive: true,
        }),
      }),
    );
  });
});
```

- [ ] **Step 10.3: Rodar testes**

```bash
npm test -- instructors.service
```

- [ ] **Step 10.4: Commit**

```bash
git add src/modules/instructors/instructors.service.ts src/modules/instructors/instructors.service.spec.ts
git commit -m "feat(instructors): findAll filtra por credentialStatus=APPROVED + stripeAccountStatus=ACTIVE"
```

---

## Task 11: E2E do fluxo Stripe (com mock global)

**Files:**

- Create: `test/payments-stripe.e2e-spec.ts`
- Create: `test/stripe-webhooks.e2e-spec.ts`
- Create: `test/stripe-connect.e2e-spec.ts`

- [ ] **Step 11.1: E2E de payment methods + charge**

```typescript
// test/payments-stripe.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { STRIPE_CLIENT } from '../src/modules/payments-stripe/stripe.client';
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

describe('PaymentsStripe (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stripeMock = {
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test_1' }),
    },
    setupIntents: {
      create: jest.fn().mockResolvedValue({ client_secret: 'seti_secret_test' }),
    },
    paymentMethods: {
      attach: jest.fn().mockResolvedValue({}),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pm_test_1',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2030,
        },
        billing_details: { name: 'Aluno LADV' },
      }),
      detach: jest.fn().mockResolvedValue({}),
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_1',
        status: 'requires_capture',
      }),
    },
    transfers: { create: jest.fn() },
    refunds: { create: jest.fn() },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STRIPE_CLIENT)
      .useValue(stripeMock)
      .compile();
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

  it('POST /payments-stripe/setup-intent returns clientSecret and persists stripeCustomerId', async () => {
    const token = await login(app, 'student-ladv@email.com');
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments-stripe/setup-intent')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(res.body.data.clientSecret).toBeTruthy();
    expect(res.body.data.customerId).toBe('cus_test_1');
  });

  it('POST /payments-stripe/payment-methods attaches and stores card metadata', async () => {
    const token = await login(app, 'student-ladv@email.com');
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments-stripe/payment-methods')
      .set('Authorization', `Bearer ${token}`)
      .send({ stripePaymentMethodId: 'pm_test_1' })
      .expect(201);
    expect(res.body.data.brand).toBe('visa');
    expect(res.body.data.last4).toBe('4242');
    expect(res.body.data.isDefault).toBe(true);
  });
});
```

- [ ] **Step 11.2: E2E de webhook (verificação de assinatura)**

```typescript
// test/stripe-webhooks.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { STRIPE_CLIENT } from '../src/modules/payments-stripe/stripe.client';

describe('StripeWebhooks (e2e)', () => {
  let app: INestApplication;
  const constructEvent = jest.fn();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STRIPE_CLIENT)
      .useValue({
        webhooks: { constructEvent },
        customers: { create: jest.fn() },
        setupIntents: { create: jest.fn() },
        paymentMethods: {},
        paymentIntents: {},
        transfers: {},
        refunds: {},
        accounts: {},
        accountLinks: {},
      })
      .compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects 400 when signature header is missing', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(400);
  });

  it('returns 200 received=true for a valid payment_intent.succeeded event', async () => {
    constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_e2e_1' } },
    });
    const res = await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Stripe-Signature', 't=1,v1=anything')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(200);
    expect(res.body.received).toBe(true);
  });

  it('returns 400 when constructEvent throws', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('invalid sig');
    });
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('Stripe-Signature', 't=1,v1=bad')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(400);
  });
});
```

- [ ] **Step 11.3: E2E do connect onboarding**

```typescript
// test/stripe-connect.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { STRIPE_CLIENT } from '../src/modules/payments-stripe/stripe.client';

const login = async (app: INestApplication, email: string): Promise<string> => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: '123456' });
  return res.body.data?.token ?? res.body.token;
};

describe('StripeConnect (e2e)', () => {
  let app: INestApplication;
  const stripeMock = {
    accounts: {
      create: jest.fn().mockResolvedValue({ id: 'acct_e2e' }),
      retrieve: jest.fn(),
    },
    accountLinks: {
      create: jest
        .fn()
        .mockResolvedValue({
          url: 'https://connect.stripe.com/setup/e2e',
          expires_at: 1700000000,
        }),
    },
    customers: { create: jest.fn() },
    setupIntents: { create: jest.fn() },
    paymentMethods: {},
    paymentIntents: {},
    transfers: {},
    refunds: {},
    webhooks: { constructEvent: jest.fn() },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STRIPE_CLIENT)
      .useValue(stripeMock)
      .compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /payments-stripe/connect/onboard returns Stripe Account Link URL', async () => {
    const token = await login(app, 'roberto@email.com'); // instructor seed
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments-stripe/connect/onboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(res.body.data.url).toMatch(/connect\.stripe\.com/);
  });
});
```

- [ ] **Step 11.4: Rodar e2e**

```bash
npm run test:e2e -- payments-stripe stripe-webhooks stripe-connect
```

Esperado: total ~7 testes passando.

- [ ] **Step 11.5: Commit**

```bash
git add test/payments-stripe.e2e-spec.ts test/stripe-webhooks.e2e-spec.ts test/stripe-connect.e2e-spec.ts
git commit -m "test(payments-stripe): e2e do fluxo Stripe completo (setup, attach, webhooks, connect)"
```

---

## Task 12: Atualizar `prisma/seed.ts` + `CLAUDE.md`

**Files:**

- Modify: `prisma/seed.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 12.1: Substituir campos antigos no seed**

Buscar no `prisma/seed.ts` por usos de `token`, `asaasId`, `asaasCustomerId` (no contexto de PaymentMethod / Payment / Student) e substituir:

| Antes | Depois |
|---|---|
| `token: 'mock-token-...'` (PaymentMethod) | `stripePaymentMethodId: 'pm_seed_${i}'` + `brand: 'visa'` |
| `asaasId: '...'` (Payment) | `stripePaymentIntentId: 'pi_seed_${i}'` |
| `asaasCustomerId: '...'` (Student) | `stripeCustomerId: 'cus_seed_${i}'` |

Se o seed atual tem ` paymentMethods.create({ token: ..., last4: '4242', ... })`, transformar em:

```typescript
await prisma.paymentMethod.create({
  data: {
    studentId: <id>,
    stripePaymentMethodId: 'pm_seed_demo_1',
    brand: 'visa',
    last4: '4242',
    cardholderName: 'ALUNO DEMO',
    expiryMonth: '12',
    expiryYear: '2030',
    isDefault: true,
  },
});
```

Adicionar também um instrutor `roberto@email.com` (já seedado) com `stripeAccountId: 'acct_seed_roberto'`, `stripeAccountStatus: 'ACTIVE'`, `stripePayoutsEnabled: true` para destravar charges no e2e.

- [ ] **Step 12.2: Rodar seed**

```bash
npx prisma db seed
```

Esperado: idempotente, sem erros de constraint.

- [ ] **Step 12.3: Atualizar `CLAUDE.md`**

Em `## Estrutura de Pastas`:

```
├── payments-stripe/   # Stripe Connect destination charges + webhooks + Connect onboarding
```

(Remover `payments/` — não existe mais.)

Em `## Stack Tecnologico`, trocar:

```
- Pagamentos: Asaas (escrow)
```

por:

```
- Pagamentos: Stripe Connect Express (Destination Charges com transfer atrasado)
```

Em `## Variaveis de Ambiente`, remover linha `ASAAS_API_KEY` e adicionar:

```
| `STRIPE_SECRET_KEY` | Chave secreta da plataforma Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret para verificação HMAC de webhooks |
| `STRIPE_CONNECT_CLIENT_ID` | Opcional; client ID do Connect (Express) |
| `STRIPE_CONNECT_REFRESH_URL` | Opcional; URL de refresh do Account Link |
| `STRIPE_CONNECT_RETURN_URL` | Opcional; URL de return do Account Link |
```

Em `## Regras Importantes`, atualizar:

```
- **Pagamentos:** Stripe Destination Charges; release via stripe.transfers.create após aula completed + isValidForCompliance(lesson)=true; idempotência via SHA-256 derivada de (subject, action)
```

(remover/substituir a regra antiga sobre Asaas).

- [ ] **Step 12.4: Commit**

```bash
git add prisma/seed.ts CLAUDE.md
git commit -m "docs(stripe): atualiza seed, CLAUDE.md e envs após migração para Stripe"
```

---

## Self-Review Checklist (executado antes da entrega)

**Spec coverage** — cada requisito das seções 4, 6 e 9 do spec:

- ✅ Schema `Payment` migrado (Seção 4) — Task 1
- ✅ Schema `PaymentMethod` migrado (Seção 4) — Task 1
- ✅ `POST /payments-stripe/setup-intent` (Seção 6) — Task 3
- ✅ `POST /payments-stripe/payment-methods` (Seção 6) — Task 3
- ✅ `DELETE /payments-stripe/payment-methods/:id` (Seção 6) — Task 3
- ✅ `POST /payments-stripe/charge` (Seção 6) — Task 4
- ✅ `GET /payments-stripe/me` (Seção 6) — Task 8
- ✅ `POST /payments-stripe/connect/onboard` (Seção 6) — Task 6
- ✅ `GET /payments-stripe/connect/status` (Seção 6) — Task 6
- ✅ `POST /payments-stripe/disputes/:lessonId/resolve` (Seção 6) — Task 5
- ✅ `POST /webhooks/stripe` com assinatura HMAC (Seção 6 + 9) — Task 7
- ✅ Destination Charges com transfer atrasado (Seção 9) — Task 5
- ✅ Stripe Connect Express com Account Link (Seção 9) — Task 6
- ✅ Webhooks: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`, `transfer.created`, `transfer.failed` (Seção 9) — Task 7
- ✅ Idempotência via `Idempotency-Key` em todas as mutações Stripe (Seção 9) — Tasks 2, 3, 4, 5, 6
- ✅ Filtro de instrutor por `stripeAccountStatus=ACTIVE` (Seção 9) — Task 10
- ✅ Remoção do módulo `payments/` Asaas (Seção 5 — "removido na mesma migration") — Task 9
- ⏭ `lessonId` deve aparecer como referência no PaymentIntent metadata para auditoria — coberto via `metadata: { lessonId, studentId, instructorId }` em Task 4

**Placeholder scan** — sem TBD/TODO/"implement later". A única instrução textual (não-código) está em Task 9 Step 9.2 sobre "localizar todos os usos de `this.asaasService.<algo>`" — isso é direcionamento de refactor sobre código existente, não placeholder. Cada Step tem código completo.

**Type consistency** — `STRIPE_CLIENT` token declarado em Task 2 e usado em Tasks 3, 5, 6, 7, 8, 11. `idempotencyKey` (Task 2) usada em Tasks 3, 4, 5, 6. `routeStripeEvent` + `StripeEventHandlers` (Task 7) consumidos em Task 7. DTOs declarados em Tasks 3, 4, 5, 6 e consumidos em Task 8 controller. `PaymentsStripeService.releaseEscrow` (Task 5) chamada em Task 9 `lessons.service.ts`. Campo `Instructor.stripeAccountId/Status` (Foundation Task 1) consumido em Tasks 5, 6, 10.

**Estado terminal deste sub-plano:**

- Pasta `payments/` Asaas removida completamente.
- Pasta `payments-stripe/` operacional com 6 services/controllers + 2 funções puras testadas.
- Migration aplicada no schema: `asaasId`/`token` substituídos por campos Stripe.
- `LessonsService.completeLesson()` aciona release automaticamente (com fallback gracioso para admin manual).
- Webhooks Stripe verificam assinatura HMAC e despacham 5 tipos de evento.
- Stripe Connect Express onboarding funcional via Account Link.
- Filtro de busca de instrutor exige Connect ACTIVE + credencial DETRAN APPROVED.
- Seed atualizado: aluno demo tem `stripeCustomerId` + 1 `PaymentMethod` Stripe; instrutor Roberto tem `stripeAccountStatus=ACTIVE`.
- 100% dos testes unitários e e2e verdes (`stripe` SDK mockado via `overrideProvider(STRIPE_CLIENT)`).

**Próximo sub-plano:** `2026-05-14-frontend-journey.md` consome todos os 9 sub-domínios do backend já operacionais — Stepper, NextStepCard, Stripe Elements, Connect onboarding e dispute flow vivem inteiramente no Next.js.
