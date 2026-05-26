# Arquitetura do Sistema — Velo API

## Filosofia Técnica

A Velo API é construída sobre **NestJS 11 com TypeScript**, seguindo os princípios de módulos coesos e independentes. Cada domínio de negócio (aulas, pagamentos, compliance, jornada do aluno) vive em seu próprio módulo com controller, service e DTOs próprios.

Todas as rotas são prefixadas com `/api/v1`. A documentação interativa está disponível em `/api/docs` (Swagger UI).

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | NestJS 11 + TypeScript |
| ORM | Prisma 7 |
| Banco de dados | PostgreSQL via Neon DB |
| Autenticação | JWT (access token) + Refresh Tokens rotativos |
| Pagamentos | Stripe Connect Express (Destination Charges) |
| OCR | Tesseract.js |
| Agendamento | `@nestjs/schedule` (cron jobs) |
| Validação de entrada | `class-validator` + `class-transformer` via `ValidationPipe` global |
| Testes | Jest + Supertest |

---

## Módulos Registrados (AppModule)

```
ConfigModule       — variáveis de ambiente validadas no startup
ThrottlerModule    — rate limiting global (ttl=60s, limit=10); overridable por rota
ScheduleModule     — cron jobs (@Cron)
HealthModule       — /health endpoint
PrismaModule       — singleton global do PrismaService

AuthModule         — login, registro, refresh token, reset de senha
StudentsModule     — perfil e ciclo de vida do aluno
InstructorsModule  — perfil, avaliações, ganhos mensais
VehiclesModule     — gestão de veículos do instrutor
AvailabilityModule — slots semanais (replace-all em transação)
BusySlotsModule    — bloqueios avulsos de disponibilidade
LessonsModule      — agendamento, biometria, checkout + hash de integridade
TelemetriaModule   — GPS em tempo real (velocidade, frenagem brusca)
PaymentsStripeModule — setup-intent, charge, escrow, release, dispute, webhooks
PaymentMethodsModule — cartões salvos do aluno
JourneyModule      — máquina de estados CONTRAN 1.020/2025
ComplianceModule   — checklist de 4 etapas + resumo prático
AcademyModule      — simulado (30 questões, 15 min, 70% aprovação)
ClinicsModule      — catálogo de clínicas médicas e psicológicas
MedicalExamModule  — agendamento + upload de laudo médico
PsychologicalExamModule — agendamento + upload de laudo psicotécnico
RenachProcessModule — guia RENACH por UF + auto-declaração
TheoryExamOfficialModule — exame teórico oficial auto-declarado
LadvProcessModule  — upload + OCR LADV
ValidationModule   — CPF/CNH local + ViaCEP + BrasilAPI + provider plugável
AdminModule        — rotas administrativas protegidas por ADMIN_API_KEY
```

---

## Padrões Globais

### Guards
- `JwtGuard` — protege rotas que exigem autenticação; disponibiliza `RequestWithUser` com o payload decodificado do JWT.
- `AdminApiKeyGuard` — protege `/api/v1/admin/*`; valida o header `x-admin-api-key` contra `ADMIN_API_KEY`.

### Interceptors
- `ResponseInterceptor` — transforma toda resposta no envelope:
  ```json
  {
    "success": true,
    "message": "...",
    "data": { ... },
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
  ```

### Pipe de Validação Global
```typescript
ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
```
Rejeita propriedades não declaradas nos DTOs.

### Rate Limiting (Throttle)
Configuração padrão: 10 requisições por 60 segundos. Rotas críticas sobrescrevem com `@Throttle`:
- Login: 5 req/60s
- Forgot password: 3 req/60s
- Refresh token: 10 req/60s
- Logout: 10 req/60s

---

## Decisões de Design Relevantes

### Separação entre Journey e Compliance
- **JourneyModule** é o orquestrador de estados: determina em qual etapa da CNH o aluno está e bloqueia ações fora de ordem (ex: não pode agendar aula antes da LADV).
- **ComplianceModule** responde "o aluno cumpriu os requisitos mínimos para o exame prático?" (120 min válidos, simulado aprovado, laudos OK).

### Escrow de Pagamento
O pagamento não vai diretamente ao instrutor. O fluxo é:
1. Aluno paga → fundos ficam retidos na conta plataforma (status `HELD`).
2. Aula é concluída e validada → `releaseEscrow()` cria a transfer para a conta Connect do instrutor.
3. Em caso de disputa → administrador decide entre `release` ou `refund`.

### Idempotência
- `releaseEscrow` e `charge` são idempotentes por `lessonId`.
- Webhooks usam o charge/transferId do Stripe para localizar o `Payment` no banco sem duplicar registros.

### Hash de Integridade
Após o checkout da aula, o `ShieldService` gera um SHA-256 a partir dos dados da aula e armazena em `integrityHash`. Uma vez que `disputeOpened=true`, o hash torna-se imutável — qualquer tentativa de atualização é bloqueada no service.

### Refresh Tokens Rotativos com Detecção de Reutilização
Cada par de tokens pertence a uma `familyId`. Ao usar um refresh token:
1. O token atual é revogado atomicamente via `updateMany` com `revokedAt=null` como condição (CAS).
2. Se `count=0` (outro processo já revogou), **toda a família é revogada** — indica comprometimento.
3. Um novo par é emitido com o mesmo `familyId`.

### OCR LADV
O Tesseract.js processa o PDF/imagem. Critérios de aprovação:
- Confiança ≥ 50%
- Keywords encontradas: `LADV`, `LICENÇA`, `APRENDIZAGEM`, ou `DETRAN`
- Número, data de emissão e validade extraídos com sucesso → `ladvOcrStatus=PASS`
- Sem número/datas → `NEEDS_REVIEW`
- Falha técnica → `FAIL`

O bypass de OCR via header `X-Test-Mode: true` está disponível apenas quando `ENABLE_TEST_MODE=true` (nunca ativar em produção com tráfego real).

### Validação de CNH do Instrutor
O `DOCUMENT_VALIDATION_PROVIDER` controla o gate 5 da criação de aula:
- `mock` (padrão) — sempre retorna válido; usado em desenvolvimento e testes.
- `serpro` — consulta a API real do SERPRO; ativa em produção quando o contrato está vigente.

---

## Cron Jobs

| Job | Frequência | Ação |
|-----|-----------|------|
| `cancelStaleBookings` | A cada hora | Cancela aulas com status `pending_acceptance` há mais de 24h |
| `escrow retry` | Configurável via `ESCROW_RETRY_CRON` | Retenta `releaseEscrow` em pagamentos com status `RELEASE_FAILED` |

---

## Estrutura de Pastas (resumida)

```
src/
├── auth/
├── students/
├── instructors/
├── ladv-process/
├── journey/
├── clinics/
├── medical-exam/
├── psychological-exam/
├── renach-process/
├── theory-exam-official/
├── lessons/
├── telemetria/
├── availability/
├── busy-slots/
├── payments-stripe/
├── payment-methods/
├── academy/
├── compliance/
├── vehicles/
├── validation/
├── common/           # guards, interceptors, geo utils (Haversine)
├── config/           # env.validation.ts
└── prisma/           # PrismaService singleton
```
