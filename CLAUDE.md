# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visao Geral

API REST NestJS para o sistema Velo de gestao de autoescola. Todas as rotas sao prefixadas com `/api/v1` e a documentacao Swagger esta disponivel em `/api/docs`. Gerencia alunos, instrutores, aulas, pagamentos e conformidade com CONTRAN 1.020/2025.

## Stack Tecnologico

- Framework: NestJS 11 + TypeScript
- ORM: Prisma 7 (PostgreSQL via Neon DB)
- Auth: JWT com bcrypt + tokens por role (aluno/instrutor)
- Pagamentos: Asaas (escrow)
- OCR: Tesseract.js
- Agendamento: @nestjs/schedule
- Testes: Jest + Supertest

## Estrutura de Pastas

```
src/
├── auth/              # login/register de alunos e instrutores
├── students/          # ciclo de vida do aluno, OCR LADV
├── instructors/       # perfis, avaliacoes, ganhos mensais
├── journey/           # orquestrador da jornada CONTRAN 1.020/2025 (estados + gates)
├── clinics/           # catalogo de clinicas medicas e psicologicas (CONTRAN 1.020/2025)
├── lessons/           # agendamento, biometria 3 pontos, hash SHA-256
├── telemetria/        # deteccao GPS (excesso de velocidade, freada brusca)
├── availability/      # slots semanais do instrutor (replace-all)
├── busy-slots/        # bloqueios avulsos de disponibilidade
├── payments/          # escrow Asaas; liberacao apos 50 min de aula
├── payment-methods/   # cartoes salvos com validacao Luhn
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
- **LADV OCR:** Tesseract.js exige keywords de CNH com >50% de confianca para aprovar aluno
- **Biometria 3 pontos:** check-in GPS obrigatorio no inicio, meio e fim da aula dentro de 50 m (Haversine em `common/utils/geo.utils.ts`)
- **Hash de integridade:** telemetria selada com SHA-256 via Shield service; hash imutavel apos disputa aberta
- **Pagamentos:** fundos Asaas liberados somente apos 50 min minimos de aula confirmados
- **Simulado:** >=21 de 30 questoes corretas em <=15 min; faz parte do checklist de compliance de 4 etapas

## Variaveis de Ambiente

Validadas no startup via `src/config/env.validation.ts`:

| Variavel | Descricao |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL connection string (Neon DB) |
| `JWT_SECRET` | Gerar com `npm run jwt-key` |
| `ASAAS_API_KEY` | Credenciais do gateway de pagamento |
| `PORT` | Opcional; padrao: 3001 |
| `DOCUMENT_VALIDATION_PROVIDER` | Opcional; `mock` (padrao) ou `serpro` |
| `VIA_CEP_BASE_URL` | Opcional; padrao `https://viacep.com.br/ws` |
| `BRASIL_API_BASE_URL` | Opcional; padrao `https://brasilapi.com.br/api` |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe (para migração de pagamentos) |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe |

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

## Sessao 2026-05-09 — Reset e Seed do Banco

**Estado atual do banco (Neon `velo-api`, `winter-frost-18826420`):**
- Todas as 13 tabelas da app (`public` schema) foram truncadas via MCP com `TRUNCATE ... CASCADE`
- `_prisma_migrations` e schema `neon_auth` preservados
- Banco repopulado com `npx prisma db seed`

**Branch ativa:** `feat/telemetry-compliance` com alteracoes nao commitadas no modulo `compliance/` (novos arquivos: `compliance.controller.ts`, `compliance.service.ts`, `compliance.service.spec.ts`, `dto/`) e modificacoes em `lessons.controller.ts`, `lessons.service.ts`, `compliance.module.ts`.

---

Ultima atualizacao: 2026-05-09

@~/.claude/RTK.md