# Referência Detalhada da API — Velo API

Todas as rotas são prefixadas com `/api/v1`. Documentação interativa disponível em `/api/docs` (Swagger UI).

**Envelope de resposta padrão:**
```json
{
  "success": true,
  "message": "...",
  "data": { },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

**Autenticação:** `Authorization: Bearer <access_token>` em rotas protegidas.

---

## Auth (`/auth`)

| Método | Rota | Auth | Rate Limit | Descrição |
|--------|------|------|-----------|-----------|
| POST | `/auth/register/student` | — | — | Registrar aluno |
| POST | `/auth/register/instructor` | — | — | Registrar instrutor |
| POST | `/auth/login/student` | — | 5/60s | Login do aluno |
| POST | `/auth/login/instructor` | — | 5/60s | Login do instrutor |
| POST | `/auth/refresh` | — | 10/60s | Renovar tokens |
| POST | `/auth/logout` | — | 10/60s | Revogar sessão |
| POST | `/auth/forgot-password` | — | 3/60s | Solicitar reset de senha |
| POST | `/auth/reset-password` | — | 5/60s | Redefinir senha via token |

### POST `/auth/register/student`
```json
// Request
{
  "name": "Gabriel Silva",
  "email": "gabriel@email.com",
  "password": "senha123",
  "cpf": "000.000.000-00",
  "phone": "11999999999"
}

// Response
{
  "access_token": "eyJ...",
  "user": { "id": "uuid", "name": "...", "email": "...", "journeyStage": "REGISTERED" }
}
```

### POST `/auth/login/student`
```json
// Request
{ "email": "gabriel@email.com", "password": "senha123" }

// Response
{
  "access_token": "eyJ...",
  "refresh_token": "hex64chars",
  "user": { "id": "uuid", "name": "...", "email": "...", "role": "student" }
}
```

### POST `/auth/refresh`
```json
// Request
{ "refresh_token": "hex64chars" }

// Response
{ "access_token": "eyJ...", "refresh_token": "novohex64chars" }
```

### POST `/auth/logout`
```json
// Request
{ "refresh_token": "hex64chars" }
```

### POST `/auth/forgot-password`
```json
// Request
{ "email": "gabriel@email.com" }
// Response: sempre 200 (não revela se o email existe)
```

### POST `/auth/reset-password`
```json
// Request
{ "token": "hex32chars", "newPassword": "novasenha123" }
```

---

## Students (`/students`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/students` | JWT | Listar alunos |
| GET | `/students/:id` | JWT | Perfil do aluno |
| PATCH | `/students/:id` | JWT | Atualizar perfil |

---

## Instructors (`/instructors`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/instructors` | — | Listar instrutores ativos |
| GET | `/instructors/:id` | — | Perfil e avaliações |
| PATCH | `/instructors/:id` | JWT | Atualizar perfil |
| GET | `/instructors/:id/earnings` | JWT | Ganhos mensais |

---

## Journey (`/journey`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/journey/me` | JWT | Estágio atual do aluno |
| GET | `/journey/me/timeline` | JWT | Timeline completa de etapas |
| POST | `/journey/me/declare-ready-for-exam` | JWT | Declarar pronto para exame prático |

### GET `/journey/me` — Response
```json
{
  "stage": "LADV_UPLOADED_VALID",
  "blockers": [],
  "totalValidatedMinutes": 90,
  "meetsMinimumLegal": false
}
```

### GET `/journey/me/timeline` — Response
```json
[
  { "stage": "REGISTERED", "status": "completed", "completedAt": "2026-01-01T..." },
  { "stage": "THEORY_COURSE_IN_PROGRESS", "status": "completed", "completedAt": "..." },
  { "stage": "LADV_UPLOADED_VALID", "status": "in_progress" },
  { "stage": "PRACTICAL_IN_PROGRESS", "status": "locked" }
]
```

---

## LADV Process (`/ladv`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/ladv/guide?uf=:uf` | JWT | Guia do processo LADV por UF |
| POST | `/ladv/me/upload` | JWT | Upload + OCR da LADV |
| GET | `/ladv/me` | JWT | Status do documento |

### POST `/ladv/me/upload`
- Body: `multipart/form-data` com campo `file` (PDF ou imagem)
- Header opcional: `X-Test-Mode: true` (apenas com `ENABLE_TEST_MODE=true`)
```json
// Response
{
  "ladvOcrStatus": "PASS",
  "ladvNumber": "12345/2026",
  "ladvOcrConfidence": 87.3,
  "ladvValidUntil": "2027-01-01T..."
}
```

---

## Renach Process (`/renach-process`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/renach-process/me` | JWT | Criar processo RENACH |
| GET | `/renach-process/me` | JWT | Consultar processo |
| PATCH | `/renach-process/me` | JWT | Atualizar (biometria concluída) |

---

## Lessons (`/lessons`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/lessons` | JWT | Agendar aula (6 gates de validação) |
| GET | `/lessons` | JWT | Listar aulas (query: studentId, instructorId) |
| PATCH | `/lessons/:id` | JWT | Atualizar dados da aula |
| PATCH | `/lessons/:id/accept` | JWT (instrutor) | Aceitar aula → processa pagamento |
| PATCH | `/lessons/:id/reject` | JWT (instrutor) | Recusar aula → sem cobrança |
| PATCH | `/lessons/:id/checkin` | JWT (instrutor) | Iniciar aula |
| PATCH | `/lessons/:id/checkout` | JWT (instrutor) | Encerrar aula + gerar hash |
| PATCH | `/lessons/:id/cancel` | JWT | Cancelar aula |
| PATCH | `/lessons/:id/feedback-instructor` | JWT (instrutor) | Avaliar desempenho do aluno |
| PATCH | `/lessons/:id/feedback-student` | JWT (aluno) | Avaliar o instrutor |
| POST | `/lessons/:id/biometry` | JWT | Registrar biometria com geofencing |

### POST `/lessons`
```json
// Request
{
  "instructorId": "uuid",
  "vehicleId": "uuid",
  "date": "2026-06-01",
  "startTime": "14:00",
  "endTime": "15:00"
}
```

### POST `/lessons/:id/biometry`
```json
// Request
{
  "point": "start",  // "start" | "mid" | "end"
  "lat": -23.5505,
  "lng": -46.6333
}

// Response 403: fora do raio de 50m (geofencing)
```

### PATCH `/lessons/:id/feedback-student`
```json
// Request
{
  "rating": 5,
  "text": "Excelente instrutor, muito paciente."
}
```

---

## Telemetria (`/telemetria`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/telemetria/:lessonId` | JWT | Enviar ponto GPS da aula |
| GET | `/telemetria/:lessonId` | JWT | Consultar telemetria da aula |

### POST `/telemetria/:lessonId`
```json
// Request
{
  "lat": -23.5505,
  "lng": -46.6333,
  "velocity": 42.5,
  "timestamp": "2026-06-01T14:30:00.000Z"
}
```

---

## Payments Stripe (`/payments-stripe`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/payments-stripe/setup-intent` | JWT (aluno) | Criar SetupIntent para salvar cartão |
| POST | `/payments-stripe/payment-methods` | JWT (aluno) | Associar cartão ao aluno |
| DELETE | `/payments-stripe/payment-methods/:id` | JWT (aluno) | Remover cartão |
| POST | `/payments-stripe/charge` | JWT (aluno) | Cobrar aula (normalmente via accept) |
| GET | `/payments-stripe/me` | JWT (aluno) | Histórico de pagamentos |
| POST | `/payments-stripe/connect/onboard` | JWT (instrutor) | Iniciar onboarding Stripe Connect |
| GET | `/payments-stripe/connect/status` | JWT (instrutor) | Status da conta Connect |
| POST | `/payments-stripe/webhook` | — | Receber eventos do Stripe |

### POST `/payments-stripe/setup-intent` — Response
```json
{ "clientSecret": "seti_..._secret_...", "customerId": "cus_..." }
```

### POST `/payments-stripe/payment-methods`
```json
// Request
{ "stripePaymentMethodId": "pm_..." }
```

### POST `/payments-stripe/charge`
```json
// Request
{ "lessonId": "uuid", "paymentMethodId": "uuid" }
```

---

## Payment Methods (`/payment-methods`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/payment-methods` | JWT (aluno) | Listar cartões salvos |
| PATCH | `/payment-methods/:id/default` | JWT (aluno) | Definir cartão padrão |

---

## Compliance (`/compliance`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/compliance/me` | JWT (aluno) | Relatório completo de compliance |
| PATCH | `/compliance/me/step` | JWT | Atualizar etapa manual (médico/psicotécnico) |
| GET | `/compliance/me/practical-summary` | JWT (aluno) | Resumo das aulas práticas |

### GET `/compliance/me` — Response
```json
{
  "steps": {
    "medico": { "completed": true },
    "psicotecnico": { "completed": false },
    "teorico": { "completed": true, "score": 24, "passedAt": "2026-04-01T..." },
    "pratico": {
      "completed": false,
      "totalMinutes": 90,
      "requiredMinutes": 120,
      "completedLessons": 2
    }
  },
  "completedSteps": 2,
  "allCompleted": false,
  "ladvValid": true
}
```

---

## Academy (`/academy`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/academy/simulado` | JWT (aluno) | Gerar prova com 30 questões |
| POST | `/academy/simulado/submit` | JWT (aluno) | Enviar respostas |
| GET | `/academy/simulado/history` | JWT (aluno) | Histórico de simulados |

### POST `/academy/simulado/submit`
```json
// Request
{
  "answers": [0, 2, 1, 3, ...],  // 30 respostas (índice 0-based)
  "startedAt": "2026-06-01T10:00:00.000Z"
}

// Response
{ "score": 24, "passed": true, "correctAnswers": 24, "totalQuestions": 30 }
```

---

## Availability (`/availability`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/availability/:instructorId` | — | Slots disponíveis do instrutor |
| PUT | `/availability` | JWT (instrutor) | Atualizar disponibilidade semanal (replace-all) |

### PUT `/availability`
```json
// Request
{
  "slots": [
    { "dayOfWeek": 1, "startTime": "08:00", "endTime": "12:00", "isEnabled": true },
    { "dayOfWeek": 3, "startTime": "14:00", "endTime": "18:00", "isEnabled": true }
  ]
}
```

---

## Busy Slots (`/busy-slots`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/busy-slots` | JWT (instrutor) | Criar bloqueio avulso |
| GET | `/busy-slots/:instructorId` | — | Listar bloqueios |
| DELETE | `/busy-slots/:id` | JWT (instrutor) | Remover bloqueio |

---

## Vehicles (`/vehicles`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/vehicles` | JWT (instrutor) | Cadastrar veículo |
| GET | `/vehicles` | JWT (instrutor) | Listar veículos do instrutor |
| PATCH | `/vehicles/:id` | JWT (instrutor) | Atualizar veículo |
| DELETE | `/vehicles/:id` | JWT (instrutor) | Remover veículo |

---

## Admin (`/admin`)

Protegido pelo header `x-admin-api-key`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/admin/payments/release-failed` | Pagamentos com falha no release |
| POST | `/admin/payments/disputes/:lessonId` | Resolver disputa (release ou refund) |
| POST | `/admin/payments/release-failed/:paymentId` | Retentar ou reembolsar release falho |
| GET | `/admin/instructors` | Listar todos os instrutores (incluindo inativos) |
| PATCH | `/admin/instructors/:id/credential` | Aprovar/rejeitar credencial |

---

## Health (`/health`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status da aplicação e conexão com BD |
