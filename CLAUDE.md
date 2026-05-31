# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visao Geral

API REST NestJS para o sistema Velo de gestao de autoescola. Todas as rotas sao prefixadas com `/api/v1` e a documentacao Swagger esta disponivel em `/api/docs`. Gerencia alunos, instrutores, aulas, pagamentos e conformidade com CONTRAN 1.020/2025.

## Stack Tecnologico

- Framework: NestJS 11 + TypeScript
- ORM: Prisma 7 (PostgreSQL via Neon DB)
- Auth: JWT com bcrypt + tokens por role (aluno/instrutor)
- Pagamentos: Stripe Connect Express (Destination Charges com transfer atrasado)
- OCR: Tesseract.js
- Agendamento: @nestjs/schedule
- Testes: Jest + Supertest

## Estrutura de Pastas

```
src/
├── auth/              # login/register de alunos e instrutores
├── students/          # ciclo de vida do aluno, OCR LADV
├── instructors/       # perfis, avaliacoes, ganhos mensais
├── ladv-process/      # upload + OCR Tesseract + entrada manual da LADV (CONTRAN etapa 7)
├── journey/           # orquestrador da jornada CONTRAN 1.020/2025 (estados + gates)
├── renach-process/    # guia por UF + auto-declaração RENACH (CONTRAN etapa 3)
├── lessons/           # agendamento, biometria 3 pontos, hash SHA-256
├── telemetria/        # deteccao GPS (excesso de velocidade, freada brusca)
├── availability/      # slots semanais do instrutor (replace-all)
├── busy-slots/        # bloqueios avulsos de disponibilidade
├── payments-stripe/   # Stripe Connect Express: setup-intent, charge, release, dispute, webhooks, onboarding
├── payment-methods/   # cartoes salvos (stripePaymentMethodId); listagem, default, delete
├── academy/           # simulado: 30 questoes, 70% aprovacao, 15 min
├── compliance/        # CONTRAN 1.020/2025, checklist 4 etapas
├── vehicles/          # gestao de veiculos do instrutor
├── validation/        # CPF/CNH locais + ViaCEP + BrasilAPI + provider externo plugavel
├── common/            # guards, interceptors, utils (geo/Haversine)
├── config/            # validacao de env (env.validation.ts)
└── prisma/            # PrismaService singleton global
```

## Convencoes de Codigo

- **Idioma do codigo:** ingles (variaveis, funcoes, tipos, comentarios)
- **DTOs:** em `dto/` ou `dtos/` com decoradores `class-validator`; `ValidationPipe` global (whitelist + forbidNonWhitelisted)
- **Responses:** sempre via `ResponseInterceptor` → `{ success, message, data, timestamp }`
- **Guards:** JWT guards protegem rotas; payload decodificado em `RequestWithUser`
- **Prisma:** usar `omit` para remover senhas em queries; atualizacoes de availability em transacao (delete + create)

## Comandos Frequentes

```bash
npm run start:dev        # dev com watch
npm run build            # compila TypeScript
npm run lint             # ESLint com auto-fix
npm run format           # Prettier em src/ e test/
npm test                 # testes unitarios
npm run test:e2e         # testes E2E (requer DB ativo)
npm run test:cov         # relatorio de cobertura
npx prisma migrate dev   # executa migracoes pendentes
npx prisma studio        # abre Prisma Studio
npm run jwt-key          # gera novo JWT secret
```

## Regras Importantes

- **Novas funcionalidades:** SEMPRE iniciar com `/tlc-spec-driven` antes de escrever qualquer codigo — gera spec, tasks e plano de implementacao
- **Git worktree:** SEMPRE usar `/using-git-worktrees` ao iniciar qualquer nova tarefa de implementacao — garante workspace isolado sem afetar a branch atual
- **LADV OCR:** Tesseract.js extrai número, emissão e validade. >=50% de confiança + keywords (LADV/LICENÇA/APRENDIZAGEM/DETRAN) → ladvOcrStatus=PASS; sem número/datas → NEEDS_REVIEW; falha → FAIL. Endpoint único `/api/v1/ladv/me/upload` (módulo `ladv-process/`)
- **Cadeia de validação de aulas:** `LessonsService.create()` executa 6 gates em sequência — journey (LADV_UPLOADED_VALID), credencial do instrutor (APPROVED + credentialValidUntil), CNH local (cnhNumber via ValidationService), CNH expiry, CNH SERPRO (se env=serpro), veículo pertence ao instrutor
- **Biometria 3 pontos:** check-in GPS obrigatorio no inicio, meio e fim da aula dentro de 50 m (Haversine em `common/utils/geo.utils.ts`)
- **Hash de integridade:** telemetria selada com SHA-256 via Shield service; hash imutavel apos disputa aberta
- **Pagamentos:** Stripe Destination Charges; release via `stripe.transfers.create` após aula `completed` + `isValidForCompliance(lesson)=true` (≥50 min, biometria OK, sem disputa); idempotência via SHA-256 derivada de `(subject, action)`. Instrutor precisa de `stripeAccountStatus=ACTIVE` para cobrar.
- **Simulado:** >=21 de 30 questoes corretas em <=15 min; faz parte do checklist de compliance de 4 etapas
- **Refresh da journey:** após qualquer mutação em RenachProcess ou theoryCourseStartedAt, chamar `JourneyService.refresh(studentId)` para atualizar o cache de `journeyStage`

## Variaveis de Ambiente

Validadas no startup via `src/config/env.validation.ts`:

| Variavel | Descricao |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL connection string (Neon DB) |
| `JWT_SECRET` | Gerar com `npm run jwt-key` |
| `ADMIN_API_KEY` | **Obrigatória**; chave da API admin (min 16 chars); protege `/api/v1/admin/*` |
| `STRIPE_SECRET_KEY` | Chave secreta da plataforma Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret para verificação HMAC de webhooks |
| `STRIPE_CONNECT_CLIENT_ID` | Opcional; client ID do Connect (Express) |
| `STRIPE_CONNECT_REFRESH_URL` | Opcional; URL de refresh do Account Link |
| `STRIPE_CONNECT_RETURN_URL` | Opcional; URL de return do Account Link |
| `PORT` | Opcional; padrao: 3001 |
| `ENABLE_TEST_MODE` | Opcional; `true` habilita bypass de OCR via header `X-Test-Mode: true` (nunca usar em produção) |
| `DOCUMENT_VALIDATION_PROVIDER` | Opcional; `mock` (padrao) ou `serpro` |
| `VIA_CEP_BASE_URL` | Opcional; padrao `https://viacep.com.br/ws` |
| `BRASIL_API_BASE_URL` | Opcional; padrao `https://brasilapi.com.br/api` |
| `PLATFORM_FEE_PERCENT` | Opcional; percentual de taxa da plataforma; padrao: `20` |
| `ESCROW_RETRY_CRON` | Opcional; expressão cron para retry do escrow release |
| `ESCROW_MAX_RETRY_ATTEMPTS` | Opcional; número máximo de tentativas de release |
| `CORS_ORIGIN` | Opcional; origem permitida pelo CORS |

## Dados de Seed (prisma/seed.ts)

Executar com `npx prisma db seed`. Cria os seguintes registros de teste (senha padrao: `123456`):

| Tipo | Nome | Email |
|------|------|-------|
| Student | Gabriel Silva | gabriel@email.com |
| Student | Maria Oliveira | maria@email.com |
| Instructor | Roberto Souza | roberto@email.com |

- **Veiculo:** Hyundai HB20 2023, placa ABC-1234, manual — vinculado ao Roberto
- **Disponibilidade:** seg–sex 08:00–18:00
- **Aulas:** 1 upcoming (2026-04-15 14h) + 1 completed com feedback (2026-04-10 09h)
- **Stripe (seed):** Roberto tem `stripeAccountId=acct_seed_roberto`, `stripeAccountStatus=ACTIVE`; Gabriel tem `stripeCustomerId=cus_seed_gabriel` + 1 PaymentMethod seed (`pm_seed_demo_1`, visa 4242)

---

Ultima atualizacao: 2026-05-15

@~/.claude/RTK.md