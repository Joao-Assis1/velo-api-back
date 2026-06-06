## 🐛 Fix: Campos faltantes no RegisterDto e schema do Vehicle

### Problema

O cadastro de instrutor retornava erro `property hasDoubleCommand should not exist` (HTTP 400). O `ValidationPipe` do NestJS com `forbidNonWhitelisted: true` rejeitava todos os campos que o frontend enviava mas não estavam declarados no DTO.

Além disso, `detranCredentialNumber` havia sido removido do `RegisterDto` e nunca era persistido no banco durante o cadastro.

### Causa Raiz

O `RegisterDto` não tinha os campos:
- `hasDoubleCommand` — se o veículo tem duplo comando
- `detranCredentialNumber` — número da credencial DETRAN (havia sido deletado)
- `noGravissima` — declaração de não infração gravíssima
- `hasInstructorCourse` — declaração de certificado do curso de instrutor
- `noCassacao` — declaração de não cassação de CNH

O model `Vehicle` no Prisma também não tinha o campo `hasDoubleCommand`.

### Solução

**`src/modules/auth/dto/register.dto.ts`**
- Adicionados os 5 campos faltantes com `@IsOptional()` e decoradores corretos

**`src/modules/auth/auth.service.ts`**
- `detranCredentialNumber`, `noGravissima`, `hasInstructorCourse` e `noCassacao` agora são persistidos no `Instructor` ao registrar
- `hasDoubleCommand` é persistido no `Vehicle.create` ao registrar

**`prisma/schema.prisma`**
- Adicionado `hasDoubleCommand Boolean?` ao model `Vehicle`
- `prisma db push` aplicado para sincronizar o banco (drift reconciliado)

### Commits incluídos neste PR

Além desta correção, o PR inclui todas as melhorias da branch `develop` desde o último merge:
- Performance, LADV, pagamentos, seed, academia, credenciamento DETRAN, e-mail, e muito mais.
