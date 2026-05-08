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
├── lessons/           # agendamento, biometria 3 pontos, hash SHA-256
├── telemetria/        # deteccao GPS (excesso de velocidade, freada brusca)
├── availability/      # slots semanais do instrutor (replace-all)
├── busy-slots/        # bloqueios avulsos de disponibilidade
├── payments/          # escrow Asaas; liberacao apos 50 min de aula
├── payment-methods/   # cartoes salvos com validacao Luhn
├── academy/           # simulado: 30 questoes, 70% aprovacao, 15 min
├── compliance/        # CONTRAN 1.020/2025, checklist 4 etapas
├── vehicles/          # gestao de veiculos do instrutor
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

---

Ultima atualizacao: 2026-05-08
