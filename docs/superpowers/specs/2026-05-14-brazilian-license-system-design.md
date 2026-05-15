# Sistema Velo — Jornada Completa da 1ª CNH (Resolução CONTRAN 1.020/2025)

**Data:** 2026-05-14
**Status:** Spec aprovada (brainstorming)
**Branch:** `claude/brazilian-license-system-boUJq`
**Repositórios:** `velo-api-back`, `velo-front-end`

---

## 1. Contexto e Objetivo

O MVP atual do Velo concentra-se na fase prática (telemetria, biometria, escrow). Esta spec expande o escopo para **englobar todo o processo de obtenção da 1ª CNH** conforme a Resolução CONTRAN 1.020/2025, **até o ponto em que o aluno fica apto a realizar o exame prático em um CFC/DETRAN**. O sistema **não emite a CNH** e **não processa o exame prático** — apenas capacita o aluno e mantém o histórico verificável das etapas anteriores.

### Escopo coberto pelo MVP

- Categoria **B** (carro) apenas
- Etapas 1 a 8 da Resolução 1.020/2025: cadastro → curso teórico → RENACH/biometria DETRAN → exame médico → exame psicológico → exame teórico oficial → LADV → aulas práticas

### Fora de escopo

- Categoria A, AB, C, D, E e MOPP
- Exame prático oficial (fica a cargo do CFC/DETRAN)
- Emissão da CNH (responsabilidade do DETRAN)
- Login gov.br OAuth (mantém JWT próprio)
- Integrações pagas com SERPRO/Senatran (apenas mock demonstrativo)

---

## 2. Mapeamento Resolução 1.020/2025 → MVP

| #   | Etapa Legal                 | Estado atual no Velo    | Ação no MVP                                                             |
| --- | --------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| 1   | Abertura do processo        | Cadastro existe         | Adicionar máquina de estados `journeyStage`                             |
| 2   | Curso teórico (EAD oficial) | Só simulado             | Apontar para app CNH do Brasil; aluno declara início                    |
| 3   | RENACH + biometria DETRAN   | Só campo no DB          | Guia por UF + auto-declaração com número RENACH                         |
| 4   | Exame médico                | Boolean no checklist    | Catálogo de clínicas + protocolo + upload de laudo pelo aluno           |
| 5   | Exame psicológico           | Boolean no checklist    | Idem médico                                                             |
| 6   | Exame teórico oficial       | Confundido com simulado | Registro auto-declarado + comprovante                                   |
| 7   | LADV emitida                | Upload com OCR existe   | Orientação de como obter no app CNH do Brasil + upload + validação      |
| 8   | Aulas práticas              | Bem implementado        | Manter; adicionar gate de LADV válida + filtro de instrutor credenciado |
| 9   | Exame prático               | Fora de escopo          | Estado terminal `READY_FOR_PRACTICAL_EXAM` + orientação por UF          |
| 10  | Emissão CNH                 | Fora de escopo          | —                                                                       |

---

## 3. Máquina de Estados da Journey

```
REGISTERED                    cadastro + termos + dados pessoais OK
    │
    ▼
THEORY_COURSE_IN_PROGRESS    aluno declarou que iniciou o EAD oficial
    │
    ▼                        em paralelo, libera:
RENACH_PENDING               guia DETRAN + número RENACH a informar
    │
    ▼      ┌─────────────────┐
    │      │ MEDICAL_PENDING │  (paralelo após RENACH_DONE)
    │      └────────┬────────┘
    │               │
    │      ┌────────▼────────┐
    │      │  PSYCH_PENDING  │  (paralelo após RENACH_DONE)
    │      └────────┬────────┘
    │               │
    ▼               ▼
THEORY_EXAM_PENDING          requer médico APTO + psico APTO + RENACH OK
    │
    ▼
AWAITING_LADV_UPLOAD         aluno passou no teórico oficial; vai ao app
                              CNH do Brasil emitir a LADV e fazer upload aqui
    │
    ▼
LADV_UPLOADED_VALID          destrava o agendamento de aulas práticas
    │
    ▼
PRACTICAL_IN_PROGRESS        primeira aula prática agendada/concluída
    │
    ▼
READY_FOR_PRACTICAL_EXAM     aluno cumpriu ≥ 2h-aula válidas (CONTRAN)
                              + se autodeclarou pronto
                              app exibe "vá ao DETRAN/CFC do seu estado"
```

### Regras de transição

- Sequencial **flexível**: médico, psico e simulado preparatório podem ser feitos em paralelo após `RENACH_DONE`.
- `THEORY_EXAM_PENDING` só destrava com **médico APTO + psico APTO + RENACH OK** (laudos válidos).
- `LADV_UPLOADED_VALID` exige exame teórico oficial declarado APROVADO + LADV no banco com `validUntil > now`.
- Aulas práticas só podem ser agendadas com `stage >= LADV_UPLOADED_VALID`.
- Estado terminal = `READY_FOR_PRACTICAL_EXAM` (não emitimos CNH).

### Cálculo do estado

Função pura `JourneyService.computeStageFromData(data)` em `src/modules/journey/`:

- Lê: `Student`, `RenachProcess`, `MedicalExam`, `PsychologicalExam`, `OfficialTheoryExam`, campos LADV no `Student`, agregado de `Lesson` via `CompliancePracticalSummary`.
- Retorna: `{ stage, completedSteps[], nextStep, blockers[], progressPct }`.
- Sem cache; sempre derivada da fonte. `Student.journeyStage` é um espelho atualizado por hook para listagens/admin.

---

## 4. Modelo de Dados (Prisma)

### Tabelas novas

```prisma
model RenachProcess {
  id              String   @id @default(uuid())
  studentId       String   @unique
  renachNumber    String?
  ufDetran        String
  biometryDoneAt  DateTime?
  status          String          // PENDING | SCHEDULED | DONE
  proofUrl        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
}

model Clinic {
  id          String   @id @default(uuid())
  name        String
  type        String          // MEDICAL | PSYCHOLOGICAL
  city        String
  uf          String
  address     String
  phone       String?
  price       Float
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  @@index([uf, city, type])
}

model MedicalExam {
  id              String   @id @default(uuid())
  studentId       String   @unique
  clinicId        String?
  protocolCode    String   @unique
  scheduledAt     DateTime?
  performedAt     DateTime?
  result          String?         // APTO | INAPTO | APTO_COM_RESTRICOES
  restrictions    String?
  validUntil      DateTime?
  laudoUrl        String?
  status          String          // PENDING | SCHEDULED | RESULT_UPLOADED | REJECTED
  rejectionReason String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  clinic          Clinic?  @relation(fields: [clinicId], references: [id])
}

model PsychologicalExam {
  // mesma forma de MedicalExam, type implícito PSYCHOLOGICAL
  id              String   @id @default(uuid())
  studentId       String   @unique
  clinicId        String?
  protocolCode    String   @unique
  scheduledAt     DateTime?
  performedAt     DateTime?
  result          String?
  restrictions    String?
  validUntil      DateTime?
  laudoUrl        String?
  status          String
  rejectionReason String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  clinic          Clinic?  @relation(fields: [clinicId], references: [id])
}

model OfficialTheoryExam {
  id          String   @id @default(uuid())
  studentId   String   @unique
  takenAt     DateTime
  score       Int?            // 0-30
  passed      Boolean
  proofUrl    String?
  createdAt   DateTime @default(now())
  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
}
```

### Alterações em tabelas existentes

**`Student`** — adicionar:

```prisma
journeyStage             String   @default("REGISTERED")
theoryCourseStartedAt    DateTime?
readyForPracticalExamAt  DateTime?
ladvNumber               String?
ladvIssuedAt             DateTime?
ladvValidUntil           DateTime?
ladvOcrConfidence        Float?
ladvOcrStatus            String?         // PASS | NEEDS_REVIEW | FAIL
stripeCustomerId         String?  @unique
// remover: asaasCustomerId
```

Os campos `ladvUploaded` e `ladv_document_url` já existentes são mantidos.

**`Instructor`** — adicionar:

```prisma
detranCredentialNumber String?
detranCredentialUf     String?
credentialValidUntil   DateTime?
credentialStatus       String   @default("PENDING")   // PENDING | APPROVED | EXPIRED
stripeAccountId        String?  @unique
stripeAccountStatus    String   @default("PENDING")   // PENDING | ONBOARDING | ACTIVE | RESTRICTED
stripePayoutsEnabled   Boolean  @default(false)
```

**`PaymentMethod`** — trocar token Asaas por Stripe:

```prisma
// substituir 'token' por:
stripePaymentMethodId String @unique
brand                 String
// resto idêntico
```

**`Payment`** — trocar Asaas por Stripe:

```prisma
// remover: asaasId
stripePaymentIntentId String?  @unique
stripeTransferId      String?  @unique
stripeRefundId        String?
// status passa a aceitar: PENDING | HELD | RELEASED | REFUNDED | FAILED
```

**`Lesson`** — sem mudanças estruturais.

**`StudentChecklist`** — mantida. Os 4 booleans (`medico`, `psicotecnico`, `teorico`, `pratico`) passam a ser **derivados** dos novos módulos via hook após updates relevantes. Não dropamos para não quebrar `compliance.service`.

---

## 5. Arquitetura dos Módulos (Backend NestJS)

### Estrutura final de `src/modules/`

```
src/modules/
├── auth/                    [mantido]
├── students/                [mantido + extensões journey + LADV fields]
├── instructors/             [mantido + credenciamento DETRAN + Stripe Connect]
├── vehicles/                [mantido]
├── availability/            [mantido]
├── busy-slots/              [mantido]
├── lessons/                 [mantido + gate de LADV válida + filtro instrutor]
├── telemetria/              [mantido]
├── compliance/              [mantido + endpoint practical-summary]
├── academy/                 [mantido — simulado preparatório]
├── payment-methods/         [tokens Stripe]
├── prisma/                  [mantido]
├── health/                  [mantido]
│
├── journey/                 [NOVO — orquestrador fino]
├── renach-process/          [NOVO]
├── clinics/                 [NOVO]
├── medical-exam/            [NOVO]
├── psychological-exam/      [NOVO]
├── theory-exam-official/    [NOVO]
├── ladv-process/            [NOVO — orienta + valida upload]
├── validation/              [NOVO — local + ViaCEP + FIPE + mock SERPRO]
└── payments-stripe/         [NOVO — substitui payments/ Asaas]
```

`payments/` (Asaas) é removido na mesma migration (não é mantido em paralelo).

### Justificativas

- **Módulos verticais por etapa + orquestrador `journey` fino**: lógica de "próximo passo" centralizada e testável; cada etapa mantém autonomia de schema e service.
- **Tabelas separadas Medical/Psychological**: domínios evoluem diferente; evita union types e queries com `WHERE type=...`.
- **`OfficialTheoryExam` separada de `StudentSimuladoHistory`**: simulado é histórico N-tentativas; oficial é carimbo único.
- **LADV continua em `Student`** (não vira tabela própria): app não emite, só valida o upload.

---

## 6. Endpoints da API (`/api/v1/...`)

### `/journey`

- `GET /journey/me` → `{stage, completedSteps, nextStep, blockers, progressPct}`
- `GET /journey/me/timeline` → estrutura para o stepper visual
- `POST /journey/me/declare-ready-for-exam` → marca `readyForPracticalExamAt`

### `/renach-process`

- `GET /renach/guide?uf=SP`
- `GET /renach/me`
- `POST /renach/me/schedule` `{uf}`
- `POST /renach/me/done` `{renachNumber, biometryDoneAt, proofFile?}`

### `/clinics`

- `GET /clinics?type=MEDICAL&uf=SP&city=Bauru` (paginada)
- `GET /clinics/:id`

### `/medical-exam` e `/psychological-exam` (estrutura idêntica)

- `GET /medical-exam/me`
- `POST /medical-exam/me/schedule` `{clinicId, scheduledAt}` → gera `protocolCode`
- `POST /medical-exam/me/laudo` multipart + `{result, validUntil, restrictions?}`
- `GET /medical-exam/me/protocol/pdf`

### `/theory-exam` (oficial)

- `GET /theory-exam/me`
- `POST /theory-exam/me` `{takenAt, score?, passed, proofFile?}`

### `/ladv`

- `GET /ladv/guide?uf=SP`
- `GET /ladv/me`
- `POST /ladv/me/upload` multipart (com OCR Tesseract)
- `POST /ladv/me/manual` `{ladvNumber, ladvIssuedAt, ladvValidUntil}`

### `/validation`

- `POST /validation/cnh` `{cnhNumber, cpf}` — local + mock SERPRO
- `POST /validation/cpf` `{cpf}` — local
- `POST /validation/vehicle-plate` `{plate}` — BrasilAPI/FIPE
- `POST /validation/cep` `{cep}` — ViaCEP (público)

### Alterações em existentes

- `POST /students/me/theory-course/start` (novo)
- `GET /instructors` — filtro implícito `credentialStatus=APPROVED`
- `PATCH /instructors/:id/credential` (admin)
- `POST /lessons` — agora roda cadeia de validações descrita abaixo

### `/payments-stripe` (substitui `/payments` Asaas)

- `POST /payments-stripe/setup-intent`
- `POST /payments-stripe/payment-methods`
- `DELETE /payments-stripe/payment-methods/:id`
- `POST /payments-stripe/charge` `{lessonId, paymentMethodId}` → `Payment.status=HELD`
- `GET /payments-stripe/me`
- `POST /payments-stripe/connect/onboard` (instrutor)
- `GET /payments-stripe/connect/status`
- `POST /payments-stripe/disputes/:lessonId/resolve` (admin)
- `POST /webhooks/stripe` (público, com assinatura)

### Convenções

- Respostas via `ResponseInterceptor` → `{success, message, data, timestamp}`
- Erros de validação padronizados: `{code, field?, message}` para tradução na UI
- Upload: 10 MB, MIME `application/pdf`, `image/jpeg`, `image/png`
- Pastas: `uploads/{ladv,medical,psychological,renach,theory-exam}/{studentId}/`

---

## 7. Validação de Documentos

### Integrações reais (grátis) no MVP

- **ViaCEP** — autocomplete de endereço (aluno, instrutor, clínica)
- **BrasilAPI / FIPE** — placa do veículo → marca/modelo/ano
- **OCR Tesseract** (já integrado) — LADV + laudos médico/psico

### Validações locais (sem API)

- CPF — algoritmo de dígitos via `cpf-cnpj-validator`
- CNH — algoritmo de dígitos via `cnh-validator`
- Validade de datas: CNH instrutor, LADV, laudos, credencial DETRAN

### Mock demonstrativo de SERPRO

Interface `DocumentValidationProvider` em `src/modules/validation/`:

```typescript
interface DocumentValidationProvider {
  validateCnh(
    cnhNumber: string,
    cpf: string,
  ): Promise<{ valid: boolean; status: string; expiresAt?: Date }>;
  validateRenach(
    renach: string,
    cpf: string,
  ): Promise<{ valid: boolean; processStatus?: string }>;
  matchFaceWithCnh(
    cpf: string,
    faceImageBase64: string,
  ): Promise<{ similarity: number; match: boolean }>;
}
```

Implementações:

- `MockValidationProvider` — sempre ativa no MVP, retorna cenários scriptados com delay
- `SerproValidationProvider` — placeholder não implementado, ativável via `DOCUMENT_VALIDATION_PROVIDER=serpro`

### Cadeia de validação em `LessonsService.create()`

```typescript
1. JourneyService.assertCanScheduleLesson(studentId)
   // gate de LADV válida e stage >= LADV_UPLOADED_VALID
2. Instrutor: credentialStatus === 'APPROVED' && credentialValidUntil > now
3. Instrutor: isValidCnhFormat(cnh) && cnhExpiry > now
4. (Opcional) DOCUMENT_VALIDATION_PROVIDER=serpro → validationProvider.validateCnh()
5. Veículo: placa cadastrada e ativa
6. Booking habitual
```

---

## 8. Compliance da Fase Prática

**Mantido sem mudanças estruturais:**

- Biometria 3 tempos com geofence Haversine 50 m
- Hash SHA-256 selado no checkout, imutável após disputa
- Regra dos 50 minutos como gate de liberação do escrow
- Telemetria GPS + detecção de eventos
- Worker diário bloqueando instrutores com CNH vencida

**Extensões:**

- `GET /compliance/student/:studentId/practical-summary` → `{totalCompletedLessons, totalValidatedMinutes, meetsMinimumLegal, lessonsWithIntegrityIssues, canDeclareReadyForExam}`
- Worker diário também marca `stripeAccountStatus=RESTRICTED` e `credentialStatus=EXPIRED`

**Critério de "aula válida para CONTRAN":**

```typescript
isValidForCompliance(lesson) =
  lesson.status === 'completed' &&
  lesson.durationMinutes >= 50 &&
  lesson.biometryStartStatus === 'SUCCESS' &&
  lesson.biometryMidStatus === 'SUCCESS' &&
  lesson.biometryEndStatus === 'SUCCESS' &&
  lesson.integrityHash !== null &&
  lesson.disputeOpened === false;
```

Aulas que não passam continuam no banco com badge "⚠️ Não validada" na UI e não contam para `totalValidatedMinutes`.

---

## 9. Migração Asaas → Stripe

### Modelo

- **Destination charges com transfer atrasado** (não split em tempo de cobrança)
- Aluno paga → `PaymentIntent` na plataforma → `Payment.status=HELD`
- Aula completa com compliance OK → `stripe.transfers.create({ destination: instructor.stripeAccountId })` → `Payment.status=RELEASED`
- Disputa → admin decide via `POST /payments-stripe/disputes/:lessonId/resolve` (`release` ou `refund`)

### Instrutor onboarding

- Stripe Connect Express Account
- Fluxo: cadastro do instrutor → após perfil OK, app gera Account Link → instrutor completa onboarding fora do app → webhook `account.updated` → `stripeAccountStatus=ACTIVE`
- Sem onboarding ativo, instrutor não aparece na busca de alunos

### Env vars

**Novas:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`, `DOCUMENT_VALIDATION_PROVIDER=mock`, `VIA_CEP_BASE_URL`, `BRASIL_API_BASE_URL`
**Removida:** `ASAAS_API_KEY`

### Webhooks Stripe

- `payment_intent.succeeded` → atualiza `Payment.status=HELD`
- `payment_intent.payment_failed` → `Payment.status=FAILED`
- `account.updated` → atualiza `stripeAccountStatus` e `stripePayoutsEnabled`
- `transfer.created` / `transfer.failed` → atualiza `Payment.status` e gera notificação

### Idempotência

Toda chamada que cria recurso Stripe usa `Idempotency-Key` (UUID por requisição).

---

## 10. Frontend (Next.js)

### Mapeamento de rotas

```
src/app/app/student/
├── dashboard/              [mantido — destaque para NextStepCard]
├── concierge/              [repurposed — "Minha Jornada" / próximo passo]
├── progress/               [repurposed — stepper visual completo]
├── academy/                [mantido — simulado preparatório]
├── schedule/               [mantido + banner se canScheduleLessons=false]
├── instructors/            [mantido + badge credenciado DETRAN]
├── payments/               [Stripe Elements]
├── dispute/                [mantido]
├── profile/                [mantido + ViaCEP]
├── settings/               [mantido]
│
├── theory-course/          [NOVO — CTA app CNH do Brasil]
├── renach/                 [NOVO — guide + form RENACH]
├── exams/
│   ├── medical/            [NOVO — catálogo + agendamento + upload laudo]
│   ├── psychological/      [NOVO — idem]
│   └── theory-official/    [NOVO — auto-declaração + comprovante]
└── ladv/                   [NOVO — guide + upload com OCR]
```

### Componentes reutilizáveis

- `<JourneyStepper />` — timeline com status/tooltip/bloqueios
- `<NextStepCard />` — destaque da próxima ação no dashboard
- `<DocumentUploader />` — drag-and-drop genérico com OCR callback
- `<ClinicCard />` — cartão de clínica no catálogo
- `<ValidatedField />` — input com validação onBlur via `/validation/*`
- `<ProtocolPdfDownload />` — botão de download de protocolo

### Estado e mensagens

- Hook `useJourney()` com React Query (cache leve, sem store global)
- `journeyBlockerMessages.ts` traduzindo códigos de bloqueio para PT-BR
- shadcn/ui (Stepper, Card, Alert, Dropzone)
- Mobile-first (testado em 360px)

---

## 11. Seeds e Demonstração

**`prisma/seed.ts` atualizado** cria 1 aluno em cada estado da journey:

- `student-registered@email.com` — REGISTERED
- `student-renach@email.com` — RENACH_PENDING
- `student-medical@email.com` — MEDICAL_PENDING (RENACH OK)
- `student-ladv@email.com` — LADV_UPLOADED_VALID
- `student-practical@email.com` — PRACTICAL_IN_PROGRESS
- `student-ready@email.com` — READY_FOR_PRACTICAL_EXAM

Mais:

- 1 instrutor credenciado ativo, 1 com credencial vencida
- 6 clínicas (3 médicas + 3 psicológicas) em São Paulo, Bauru, Campinas
- Banco de questões do simulado mantido
- Senha padrão de teste: `123456`

---

## 12. Testes Prioritários

- `JourneyService.computeStage()` — 1 teste por transição válida (~12) e 1 por bloqueio (~6)
- `LessonsService.create()` — gate LADV inválida/vencida + instrutor sem credencial
- `MedicalExamService.uploadLaudo()` — happy path + OCR ambíguo (rejeição manual)
- `PaymentsStripeService.releaseEscrow()` — só libera se compliance OK; idempotência do transfer
- `ValidationService` — CPF/CNH locais; ViaCEP/FIPE com fetch mockado; mock SERPRO determinístico
- E2E: cadastro → declara teórico → RENACH → médico apto → psico apto → exame teórico passou → upload LADV → 2 aulas práticas válidas → declara ready

---

## 13. Documentação a Atualizar

- `docs/business-logic.md` — adicionar seção "Journey do aluno" com máquina de estados
- `docs/api-reference.md` — endpoints novos (Swagger gera automático, validar saída)
- `docs/database.md` — refletir schema novo
- `CLAUDE.md` — atualizar "Estrutura de Pastas" com módulos novos
- `Velo_API_Postman_Collection.json` — collections dos endpoints novos

---

## 14. Ordem Sugerida de Implementação

1. Schema Prisma + migration (todas as alterações de tabela de uma vez)
2. Módulo `journey/` (função pura de transição é a base)
3. `renach-process/`, `theory-exam-official/`
4. `clinics/` + `medical-exam/` + `psychological-exam/`
5. `ladv-process/` (extensões; OCR já existe)
6. `validation/` (local + ViaCEP + FIPE + mock SERPRO)
7. `payments-stripe/` substituindo `payments/`
8. Ajustes em `lessons/`, `instructors/`, `compliance/`
9. Frontend: rotas novas + repurpose de `concierge` e `progress`
10. Seeds + testes + docs

---

## 15. Não-Objetivos Explícitos

- Não implementar integração real SERPRO/Senatran/DETRAN (apenas mock + interface pronta)
- Não implementar login gov.br OAuth
- Não suportar categorias além de B
- Não emitir CNH ou processar exame prático
- Não manter `payments/` Asaas em paralelo durante a migração — substituição completa
- Não hospedar conteúdo do curso teórico — apontar para o EAD oficial do Ministério dos Transportes
