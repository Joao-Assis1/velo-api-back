# VELO-api

Setup inicial da API em NestJS com padronização em MVP (Model-View-Presenter), focado em organização por módulo e evolução para produção.

## Stack

- NestJS 11
- TypeScript
- Configuração global com `@nestjs/config`
- Validação global com `class-validator` e `class-transformer`

## Estrutura base (MVP)

```text
src/
  common/
    interfaces/
      api-response.interface.ts
  config/
    env.validation.ts
  modules/
    health/
      application/
        get-health.use-case.ts
      domain/
        health-status.model.ts
      presentation/
        health.controller.ts
        health.presenter.ts
      health.module.ts
  app.module.ts
  main.ts
```

## Como rodar

```bash
npm install
npm run start:dev
```

API disponível em:

- `GET /api/v1/health`

## Scripts

- `npm run start:dev` → desenvolvimento com watch
- `npm run build` → build de produção
- `npm run test` → testes unitários
- `npm run test:e2e` → testes end-to-end

## Próximos passos sugeridos

1. Criar módulos de negócio em `src/modules/*` seguindo o mesmo padrão MVP.
2. Adicionar DTOs e validações por endpoint.
3. Integrar banco de dados (Prisma/TypeORM).
4. Adicionar autenticação (JWT + Guards).
