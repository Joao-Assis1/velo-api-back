# Modelo de Dados

O banco de dados PostgreSQL é gerenciado via Prisma ORM.

## Principais Entidades

### Student / StudentChecklist
Armazena dados do aluno e seu progresso nas etapas do DETRAN.
- `ladvUploaded`: Indica se o aluno já pode agendar aulas práticas.

### Instructor
Dados do profissional de ensino.
- `isActive`: Campo crítico controlado pelo Worker de conformidade. Se `false`, o instrutor é impedido de atuar.

### Lesson
O núcleo do sistema. Relaciona aluno, instrutor, veículo e telemetria.
- `integrityHash`: Prova técnica da realização da aula.
- `paymentReleased`: Status do Escrow.

### Question / StudentSimuladoHistory
Base de dados para o simulado teórico da Velo Academy.
- Categorias: Legislação, Direção Defensiva, Primeiros Socorros, Meio Ambiente e Mecânica.

### Payment
Rastreamento de transações.
- `asaasId`: ID único para garantir idempotência em webhooks.
