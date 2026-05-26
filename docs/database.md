# Modelo Físico de Dados — Velo API

O banco de dados PostgreSQL é gerenciado via **Prisma 7** (Neon DB). Abaixo estão todas as entidades com seus campos e relacionamentos.

---

## Student

Representa o aluno em processo de habilitação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `email` | String (unique) | |
| `name` | String | |
| `phone` | String? | |
| `cpf` | String? | |
| `password` | String | Hash bcrypt |
| `profilePicture` | String? | URL |
| `birthDate` | DateTime? | |
| `motherName` | String? | |
| `ufDomicile` | String? | UF de residência |
| `intendedCategory` | String? | Categoria CNH desejada |
| `termsAcceptedAt` | DateTime? | |
| `journeyStage` | String | Cache do estágio atual (default: `REGISTERED`) |
| `theoryCourseStartedAt` | DateTime? | Marca início do curso teórico |
| `readyForPracticalExamAt` | DateTime? | Marca auto-declaração para exame prático |
| `ladvUploaded` | Boolean | |
| `ladv_document_url` | String? | |
| `ladv_validation_date` | DateTime? | |
| `ladvNumber` | String? | |
| `ladvIssuedAt` | DateTime? | |
| `ladvValidUntil` | DateTime? | |
| `ladvOcrConfidence` | Float? | Confiança do OCR (0–100) |
| `ladvOcrStatus` | String? | `PASS`, `NEEDS_REVIEW`, `FAIL` |
| `stripeCustomerId` | String? (unique) | Customer ID no Stripe |
| `passwordResetToken` | String? | |
| `passwordResetExpires` | DateTime? | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Relações:** `lessons[]`, `payments[]`, `paymentMethods[]`, `checklist` (1:1), `simulados[]`, `renachProcess` (1:1), `medicalExam` (1:1), `psychologicalExam` (1:1), `officialTheoryExam` (1:1)

---

## Instructor

Representa o instrutor de direção.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `email` | String (unique) | |
| `name` | String | |
| `phone` | String? | |
| `cpf` | String? | |
| `password` | String | Hash bcrypt |
| `profilePicture` | String? | |
| `bio` | String? | |
| `instructorType` | String? | `Credenciado` ou `Autônomo` |
| `location` | String? | |
| `pricePerClass` | Float? | Valor em reais |
| `rating` | Float | Média de avaliações (default: 0) |
| `reviewsCount` | Int | Total de avaliações (default: 0) |
| `cnhNumber` | String? | |
| `cnhCategory` | String? | |
| `cnhExpiry` | DateTime? | |
| `cnhEar` | Boolean? | CNH com restrição auditiva |
| `certidaoNegativa` | String? | URL do documento |
| `birthDate` | DateTime? | |
| `educationLevel` | String? | |
| `renachNumber` | String? | |
| `isActive` | Boolean | default: true |
| `detranCredentialNumber` | String? | |
| `detranCredentialUf` | String? | |
| `credentialValidUntil` | DateTime? | |
| `credentialStatus` | String | `PENDING`, `APPROVED`, `REJECTED` (default: `PENDING`) |
| `pixKey` | String? | |
| `bankCode` | String? | |
| `bankAgency` | String? | |
| `bankAccount` | String? | |
| `stripeAccountId` | String? (unique) | Conta Connect Express |
| `stripeAccountStatus` | String | `PENDING`, `ACTIVE`, `RESTRICTED` (default: `PENDING`) |
| `stripePayoutsEnabled` | Boolean | default: false |
| `passwordResetToken` | String? | |
| `passwordResetExpires` | DateTime? | |
| `termsAcceptedAt` | DateTime? | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Relações:** `availabilities[]`, `lessons[]`, `vehicles[]`, `busySlots[]`

---

## Vehicle

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `plate` | String (unique) | Placa |
| `model` | String | |
| `year` | String | |
| `transmission` | String | `manual` ou `automatic` |
| `vehiclePhoto` | String? | URL |
| `instructorId` | UUID | FK → Instructor |

**Relações:** `lessons[]`, `instructor`

---

## Availability

Slots semanais recorrentes do instrutor.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `instructorId` | UUID | FK → Instructor |
| `dayOfWeek` | Int | 0 (Dom) – 6 (Sáb) |
| `startTime` | String | ex: `"08:00"` |
| `endTime` | String | ex: `"18:00"` |
| `isEnabled` | Boolean | |

Atualizações de disponibilidade são feitas em transação (delete + create para o instrutor).

---

## BusySlot

Bloqueios avulsos de disponibilidade.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `instructorId` | UUID | FK → Instructor |
| `date` | DateTime | |
| `startTime` | String | |
| `endTime` | String | |
| `reason` | String? | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Unique:** `[instructorId, date, startTime]`

---

## Lesson

Núcleo do sistema — conecta aluno, instrutor e veículo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `studentId` | UUID | FK → Student |
| `instructorId` | UUID | FK → Instructor |
| `vehicleId` | UUID? | FK → Vehicle |
| `date` | DateTime | |
| `startTime` | String | |
| `endTime` | String | |
| `price` | Float | |
| `status` | String | `pending_acceptance`, `upcoming`, `in-progress`, `completed`, `cancelled` |
| `checkInTime` | DateTime? | |
| `checkOutTime` | DateTime? | |
| `durationMinutes` | Int? | Calculado no checkout |
| `instructorFeedback` | String? | Avaliação do desempenho do aluno |
| `studentFeedbackRating` | Int? | Nota (aluno → instrutor) |
| `studentFeedbackText` | String? | |
| `integrityHash` | String? | SHA-256 gerado no checkout |
| `biometryStartStatus` | String? | `SUCCESS`, `FAILED` |
| `biometryStartAt` | DateTime? | |
| `biometryMidStatus` | String? | `SUCCESS`, `FAILED` |
| `biometryMidAt` | DateTime? | |
| `biometryEndStatus` | String? | `SUCCESS`, `FAILED` |
| `biometryEndAt` | DateTime? | |
| `paymentReleased` | Boolean | default: false |
| `disputeOpened` | Boolean | default: false |
| `disputeReason` | String? | |
| `createdAt` | DateTime | |

**Unique:** `[instructorId, date, startTime]`

**Relações:** `instructor`, `student`, `vehicle`, `payment` (1:1), `telemetry[]`, `events[]`

---

## LessonTelemetry

Pontos GPS capturados durante a aula.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `lessonId` | UUID | FK → Lesson |
| `timestamp` | DateTime | |
| `lat` | Float | |
| `lng` | Float | |
| `velocity` | Float | km/h (default: 0) |

---

## LessonEvent

Eventos detectados durante a aula (velocidade, frenagem, etc.).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `lessonId` | UUID | FK → Lesson |
| `type` | Enum | `SPEED_LIMIT`, `HARSH_BRAKING`, `ROUTE_DEVIATION`, `ENGINE_ON`, `ENGINE_OFF` |
| `message` | String? | |
| `lat` | Float? | |
| `lng` | Float? | |
| `timestamp` | DateTime | |

---

## Payment

Rastreamento de transações Stripe.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `studentId` | UUID | FK → Student |
| `lessonId` | UUID (unique) | FK → Lesson |
| `paymentMethodId` | UUID? | FK → PaymentMethod |
| `amount` | Float | Valor total em reais |
| `status` | String | `PENDING`, `HELD`, `RELEASED`, `FAILED`, `RELEASE_FAILED`, `REFUNDED` |
| `stripePaymentIntentId` | String? (unique) | |
| `stripeChargeId` | String? (unique) | |
| `stripeTransferId` | String? (unique) | |
| `stripeRefundId` | String? | |
| `failureReason` | String? | |
| `platformFeeAmount` | Float? | Valor da taxa de plataforma |
| `instructorAmount` | Float? | Valor repassado ao instrutor |
| `releaseAttempts` | Int | Tentativas de release (default: 0) |
| `lastReleaseAttemptAt` | DateTime? | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

---

## PaymentMethod

Cartões salvos do aluno.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `studentId` | UUID | FK → Student |
| `stripePaymentMethodId` | String (unique) | ID no Stripe |
| `brand` | String | ex: `visa`, `mastercard` |
| `last4` | String | Últimos 4 dígitos |
| `cardholderName` | String? | |
| `expiryMonth` | Int | |
| `expiryYear` | Int | |
| `isDefault` | Boolean | default: false |
| `isDeleted` | Boolean | Soft delete (default: false) |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

---

## RefreshToken

Tokens de atualização JWT com rotação e detecção de reutilização.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `tokenHash` | String (unique) | SHA-256 do token |
| `userId` | UUID | ID do student ou instructor |
| `role` | String | `student` ou `instructor` |
| `familyId` | UUID | Agrupa tokens de uma mesma sessão |
| `expiresAt` | DateTime | Expiração (30 dias) |
| `revokedAt` | DateTime? | Revogado em (null = válido) |
| `createdAt` | DateTime | |

**Índices:** `[userId, role]`, `[familyId]`

---

## RenachProcess

Processo RENACH por aluno.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `studentId` | UUID (unique) | FK → Student |
| `renachNumber` | String | |
| `ufDetran` | String | UF do DETRAN |
| `status` | String | `PENDING`, `DONE` |
| `biometryDoneAt` | DateTime? | |
| `proofUrl` | String? | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

---

## StudentChecklist

Checklist de compliance do aluno (1:1 com Student).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `studentId` | UUID (unique) | FK → Student |
| `medico` | Boolean | Exame médico concluído |
| `psicotecnico` | Boolean | Exame psicotécnico concluído |
| `teorico` | Boolean | Simulado aprovado |
| `pratico` | Boolean | ≥ 120 min de aulas válidas |
| `updatedAt` | DateTime | |

---

## Clinic

Catálogo de clínicas médicas e psicológicas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `name` | String | |
| `type` | String | `MEDICO` ou `PSICOLOGICO` |
| `city` | String | |
| `uf` | String | |
| `address` | String | |
| `phone` | String? | |
| `price` | Float? | |
| `isActive` | Boolean | default: true |
| `createdAt` | DateTime | |

**Relações:** `medicalExams[]`, `psychologicalExams[]`

---

## MedicalExam / PsychologicalExam

Estrutura idêntica para os dois exames.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `studentId` | UUID (unique) | FK → Student |
| `clinicId` | UUID | FK → Clinic |
| `protocolCode` | String (unique) | Gerado automaticamente |
| `scheduledAt` | DateTime? | |
| `performedAt` | DateTime? | |
| `result` | String? | `APTO`, `APTO_COM_RESTRICOES`, `INAPTO` |
| `restrictions` | String? | |
| `validUntil` | DateTime? | Validade do laudo |
| `laudoUrl` | String? | URL do documento |
| `status` | String | `PENDING`, `SCHEDULED`, `RESULT_UPLOADED`, `REJECTED` |
| `rejectionReason` | String? | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

---

## OfficialTheoryExam

Auto-declaração do exame teórico no DETRAN.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `studentId` | UUID (unique) | FK → Student |
| `takenAt` | DateTime | Data de realização |
| `score` | Int | Pontuação |
| `passed` | Boolean | |
| `proofUrl` | String? | Comprovante |
| `createdAt` | DateTime | |

---

## Question

Banco de questões do simulado.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `text` | String | Enunciado |
| `category` | String | Categoria (Legislação, Direção Defensiva, etc.) |
| `options` | String[] | Array de alternativas |
| `correct` | Int | Índice da alternativa correta (0-based) |
| `createdAt` | DateTime | |

---

## StudentSimuladoHistory

Histórico de simulados realizados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `studentId` | UUID | FK → Student |
| `score` | Int | Acertos (0–30) |
| `passed` | Boolean | ≥ 21 acertos |
| `startedAt` | DateTime | |
| `submittedAt` | DateTime | |

---

## Diagrama de Relacionamentos (simplificado)

```
Student ──── StudentChecklist (1:1)
        ──── RenachProcess (1:1)
        ──── MedicalExam (1:1)
        ──── PsychologicalExam (1:1)
        ──── OfficialTheoryExam (1:1)
        ──── Lesson[] (1:N)
        ──── Payment[] (1:N)
        ──── PaymentMethod[] (1:N)
        ──── StudentSimuladoHistory[] (1:N)
        ──── RefreshToken[] (1:N via userId+role)

Instructor ──── Availability[] (1:N)
           ──── BusySlot[] (1:N)
           ──── Vehicle[] (1:N)
           ──── Lesson[] (1:N)
           ──── RefreshToken[] (1:N via userId+role)

Lesson ──── Payment (1:1)
       ──── LessonTelemetry[] (1:N)
       ──── LessonEvent[] (1:N)
       ──── Vehicle (N:1)

Clinic ──── MedicalExam[] (1:N)
       ──── PsychologicalExam[] (1:N)
```
