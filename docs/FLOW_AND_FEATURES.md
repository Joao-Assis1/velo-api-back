# Fluxo e Funcionalidades Globais — Velo API

Visão ponta a ponta do comportamento do Aluno e do Instrutor, desde o cadastro até a declaração de prontidão para o exame prático.

---

## 1. Papéis do Sistema

| Papel | Descrição |
|-------|-----------|
| `student` | Aluno em processo de habilitação |
| `instructor` | Profissional credenciado que ministra aulas |
| `admin` | Operador interno com acesso via `ADMIN_API_KEY` |

---

## 2. Fluxo do Aluno (Student Flow)

### 2.1 Cadastro e Autenticação

1. `POST /auth/register/student` com nome, email, CPF, telefone e senha.
2. O sistema cria o aluno, inicializa a jornada (`journeyStage = REGISTERED`) via `JourneyService.initForStudent()` e retorna `access_token`.
3. Logins subsequentes: `POST /auth/login/student` → retorna `access_token` + `refresh_token`.
4. Para renovar a sessão sem novo login: `POST /auth/refresh` com o `refresh_token` atual — ambos os tokens são rotacionados. Reutilização de token revogado revoga toda a família de sessão (proteção contra roubo de token).

### 2.2 Jornada CONTRAN 1.020/2025

O campo `journeyStage` representa o estágio atual do aluno. A progressão é sequencial e bloqueante:

```
REGISTERED
  ↓ (curso teórico iniciado)
THEORY_COURSE_IN_PROGRESS
  ↓ (RENACH criado)
RENACH_PENDING
  ↓ (biometria DETRAN realizada)
MEDICAL_PENDING
  ↓ (laudo médico APTO enviado)
PSYCH_PENDING
  ↓ (laudo psicotécnico APTO enviado)
THEORY_EXAM_PENDING
  ↓ (exame teórico oficial aprovado)
AWAITING_LADV_UPLOAD
  ↓ (LADV com OCR PASS)
LADV_UPLOADED_VALID
  ↓ (primeira aula concluída)
PRACTICAL_IN_PROGRESS
  ↓ (≥120 min + declaração)
READY_FOR_PRACTICAL_EXAM
```

O aluno pode consultar:
- `GET /journey/me` — estágio atual e bloqueadores ativos.
- `GET /journey/me/timeline` — todas as etapas com status (`completed`, `in_progress`, `locked`).

### 2.3 Processo RENACH

1. `POST /renach-process/me` com `renachNumber` e `ufDetran`.
2. Após realizar biometria no DETRAN: `PATCH /renach-process/me` com `status: "DONE"`.
3. Journey é atualizada automaticamente.

### 2.4 Exame Médico

1. `GET /clinics?type=MEDICO&uf=SP` — consultar clínicas disponíveis.
2. `POST /medical-exam/me` — agendar com `clinicId` e `scheduledAt`.
3. Após realização: `POST /medical-exam/me/upload` com PDF do laudo.
4. Se `result = APTO` e dentro da validade → journey avança para `PSYCH_PENDING`.

### 2.5 Exame Psicotécnico

Fluxo idêntico ao médico com clínicas do tipo `PSICOLOGICO`. Ambos os laudos precisam estar válidos ao mesmo tempo.

### 2.6 Exame Teórico Oficial

1. Aluno realiza o exame presencialmente no DETRAN.
2. `POST /theory-exam-official/me` com `takenAt`, `score`, `passed`, `proofUrl`.
3. Se `passed = true` → journey avança para `AWAITING_LADV_UPLOAD`.

### 2.7 Upload da LADV

1. `POST /ladv/me/upload` com multipart/form-data (PDF ou imagem da LADV).
2. Tesseract.js processa o OCR:
   - `PASS` → `ladvOcrStatus = PASS`, `ladvValidUntil` preenchido → journey avança para `LADV_UPLOADED_VALID`.
   - `NEEDS_REVIEW` → admin revisa manualmente.
   - `FAIL` → aluno reenvia o documento.
3. Em ambiente de teste com `ENABLE_TEST_MODE=true`: header `X-Test-Mode: true` bypassa o OCR.

### 2.8 Aulas Práticas

**Pré-requisito:** `journeyStage ≥ LADV_UPLOADED_VALID`.

**Fluxo de agendamento:**
1. Aluno consulta disponibilidade do instrutor: `GET /availability/:instructorId`.
2. `POST /lessons` com `instructorId`, `vehicleId`, `date`, `startTime`, `endTime`.
   - 6 gates de validação executados em sequência (ver `docs/business-logic.md`).
   - Aula criada com `status = pending_acceptance`.
3. Instrutor aceita: `PATCH /lessons/:id/accept`.
   - Sistema cobra o aluno automaticamente via `charge()` (usa cartão padrão).
   - Fundos ficam retidos (`status = HELD`).
   - Aula muda para `upcoming`.

**Fluxo da aula:**
4. Instrutor inicia: `PATCH /lessons/:id/checkin` → `in-progress`.
5. Durante a aula, GPS é enviado: `POST /telemetria/:lessonId`.
6. Biometria registrada em 3 pontos: `POST /lessons/:id/biometry` com `point: "start" | "mid" | "end"`.
   - GPS validado por geofencing (50 m de raio via Haversine).
7. Instrutor encerra: `PATCH /lessons/:id/checkout`.
   - `durationMinutes` calculado.
   - `integrityHash` gerado (SHA-256).
   - Se aula ≥ 50 min + 3 biometrias OK + sem disputa → `releaseEscrow()` chamado automaticamente.
   - Fundos transferidos para conta Stripe Connect do instrutor.

**Feedbacks:**
- Instrutor avalia aluno: `PATCH /lessons/:id/feedback-instructor`.
- Aluno avalia instrutor: `PATCH /lessons/:id/feedback-student` com `rating` e `text`.

### 2.9 Cartões de Pagamento

1. `POST /payments-stripe/setup-intent` → obtém `clientSecret` para tokenizar cartão no front-end.
2. Após tokenização pelo Stripe.js: `POST /payments-stripe/payment-methods` com `stripePaymentMethodId`.
3. Primeiro cartão adicionado vira o padrão automaticamente.
4. `GET /payment-methods` — listar cartões; `PATCH /payment-methods/:id/default` — trocar padrão.

### 2.10 Simulado (Velo Academy)

1. `GET /academy/simulado` → 30 questões aleatórias.
2. Aluno responde e submete: `POST /academy/simulado/submit` com array de 30 respostas.
3. Se `score ≥ 21` em ≤ 15 min → `passed = true` → item `teorico` do compliance atualizado.

### 2.11 Compliance e Declaração Final

1. `GET /compliance/me` — ver progresso dos 4 itens (médico, psicotécnico, teórico, prático).
2. Quando `totalValidatedMinutes ≥ 120`:
   - `POST /journey/me/declare-ready-for-exam` → registra `readyForPracticalExamAt`.
   - Journey avança para `READY_FOR_PRACTICAL_EXAM`.

---

## 3. Fluxo do Instrutor (Instructor Flow)

### 3.1 Cadastro e Onboarding

1. `POST /auth/register/instructor` com dados pessoais + CNH.
2. Login: `POST /auth/login/instructor`.
3. Credencial DETRAN: enviada via PATCH no perfil (`detranCredentialNumber`, `credentialValidUntil`).
   - Admin aprova via `PATCH /admin/instructors/:id/credential` → `credentialStatus = APPROVED`.
   - Sem aprovação: nenhuma aula pode ser agendada com o instrutor.

### 3.2 Onboarding Stripe Connect

Para receber pagamentos:
1. `POST /payments-stripe/connect/onboard` → retorna URL do onboarding Express.
2. Instrutor completa o cadastro no Stripe.
3. Webhook `account.updated` atualiza `stripeAccountStatus = ACTIVE`.
4. `GET /payments-stripe/connect/status` — verificar status da conta.

### 3.3 Configuração de Disponibilidade

1. `PUT /availability` com array de slots por dia da semana.
   - Operação replace-all em transação (todos os slots anteriores são removidos).
2. Bloqueios pontuais: `POST /busy-slots` com `date`, `startTime`, `endTime`.

### 3.4 Gestão de Veículos

1. `POST /vehicles` com `plate`, `model`, `year`, `transmission`.
2. Veículo é vinculado ao instrutor e pode ser selecionado no agendamento de aulas.

### 3.5 Gerenciar Aulas

- **Aceitar:** `PATCH /lessons/:id/accept` — cobra o aluno e agenda a aula.
- **Recusar:** `PATCH /lessons/:id/reject` — cancela sem cobrança.
- **Check-in/out:** inicia e encerra a aula com registro de timestamps.
- **Biometria:** registra os 3 pontos GPS.
- **Feedback:** avalia o desempenho do aluno após cada aula.

### 3.6 Cancelamento

- Aluno ou instrutor podem cancelar: `PATCH /lessons/:id/cancel`.
- Se pagamento em `PENDING` ou `HELD` → reembolso automático via Stripe.

---

## 4. Fluxo do Admin

### 4.1 Credenciais de Instrutores

- `PATCH /admin/instructors/:id/credential` com `credentialStatus: "APPROVED" | "REJECTED"`.

### 4.2 Disputas e Pagamentos

- `GET /admin/payments/release-failed` — pagamentos que falharam no repasse ao instrutor.
- `POST /admin/payments/disputes/:lessonId` com `action: "release" | "refund"` para resolver disputas abertas.
- `POST /admin/payments/release-failed/:paymentId` com `action: "retry" | "refund"` para pagamentos com `RELEASE_FAILED`.

---

## 5. Eventos Automáticos (Cron Jobs)

| Job | Frequência | Ação |
|-----|-----------|------|
| `cancelStaleBookings` | A cada hora | Cancela `pending_acceptance` com > 24h |
| Escrow retry | Configurável (`ESCROW_RETRY_CRON`) | Retenta release em pagamentos `RELEASE_FAILED` |

---

## 6. Webhooks Stripe

O endpoint `POST /payments-stripe/webhook` recebe e processa:

| Evento Stripe | Ação |
|--------------|------|
| `payment_intent.succeeded` | Payment: `PENDING` → `HELD` |
| `payment_intent.payment_failed` | Payment: → `FAILED`, armazena `failureReason` |
| `account.updated` | Atualiza `stripeAccountStatus` do instrutor |
| `transfer.created` | Log (pagamento já persistido) |
| `transfer.failed` | Payment: `RELEASED` → `HELD` (reverso) |

---

## 7. Diagrama de Interação Aluno ↔ Instrutor

```
Aluno                          Sistema                        Instrutor
  │                               │                               │
  ├─ POST /lessons ──────────────►│ (6 gates) status=pending_acc  │
  │                               ├──────────────────────────────►│ notificado
  │                               │                               │
  │                               │◄─── PATCH /lessons/:id/accept ┤
  │                               │ charge(aluno)                 │
  │                               │ status=upcoming               │
  │                               │                               │
  │                               │◄──── PATCH /lessons/:id/checkin┤
  │                               │ status=in-progress            │
  │                               │                               │
  │ (durante a aula)              │                               │
  ├─ POST /telemetria ───────────►│                               │
  ├─ POST /lessons/:id/biometry ─►│ (geofencing 50m)              │
  │                               │◄── POST /lessons/:id/biometry ┤
  │                               │                               │
  │                               │◄─ PATCH /lessons/:id/checkout ┤
  │                               │ hash SHA-256, releaseEscrow() │
  │                               │ transfer → conta Stripe inst. │
  │                               │                               │
  ├─ PATCH /feedback-student ────►│ rating → instrutor.rating     │
  │                               │◄─── PATCH /feedback-instructor┤
```
