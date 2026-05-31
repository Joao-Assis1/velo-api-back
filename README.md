# Velo API 🚗💨

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-39827B?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Neon Database](https://img.shields.io/badge/Neon-00E599?style=for-the-badge&logo=neon&logoColor=black)](https://neon.tech/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)
[![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)

O **Velo API** é a espinha dorsal de um ecossistema digital moderno projetado para transformar o processo de aprendizagem prática e teórica em autoescolas. A plataforma permite conectar **Alunos** (estudantes em processo de habilitação) e **Instrutores** (credenciados ou autônomos), garantindo automação operacional, agendamento inteligente, segurança jurídica e conformidade técnica rígida com as diretrizes do DETRAN.

---

## 🛡️ Diferencial Competitivo & Compliance Regulatório

A Velo API foi concebida sob o paradigma de **Compliance-first**, atendendo plenamente à **Resolução CONTRAN 1.020/2025** e garantindo que nenhuma etapa da jornada de trânsito possa ser burlada.

### 🛣️ 1. Máquina de Estados da Jornada Burocrática
O progresso do aluno para obtenção da 1ª CNH (Categoria B) é modelado de forma estrita em uma máquina de estados pura (`Student.journeyStage`). Nenhuma aula prática pode ser agendada se o aluno não passar pelas validações de conformidade anteriores.
* **Transições Sequenciais:** `REGISTERED` ➡️ `THEORY_COURSE_IN_PROGRESS` ➡️ `RENACH_PENDING` ➡️ `AWAITING_LADV_UPLOAD` ➡️ `LADV_UPLOADED_VALID` ➡️ `PRACTICAL_IN_PROGRESS` ➡️ `READY_FOR_PRACTICAL_EXAM`.
* **Trava Regulatória:** O `LessonsService.create()` valida ativamente se o `journeyStage` do aluno é igual ou superior a `LADV_UPLOADED_VALID` antes de liberar qualquer agendamento.

### 📸 2. Biometria em 3 Tempos & Geofencing
Para mitigar e eliminar fraudes em aulas práticas de direção, a API implementa uma validação biométrica facial trifásica obrigatória integrada ao GPS:
1. **Check-in (Início da Aula):** Libera a ignição virtual do veículo na plataforma.
2. **Aleatório (Mid-Class):** Disparado dinamicamente durante o percurso da aula prática.
3. **Check-out (Fim da Aula):** Conclui e valida a realização.
* **Geofencing:** O sistema possui um algoritmo de segurança geográfica que rejeita a validação biométrica se o ponto de captura do celular estiver fora de um raio de **50 metros** das coordenadas de telemetria mais recentes enviadas pelo veículo.

### 🔒 3. Escudo de Integridade (Caixa Preta da Aula)
Ao fim de cada aula prática, a plataforma executa uma rotina criptográfica que concatena todos os dados de telemetria do percurso (latitude, longitude, velocidade instantânea e carimbo de data/hora).
* O resultado é compilado em um hash **SHA-256** imutável armazenado no campo `integrityHash`.
* Se uma disputa operacional for aberta sobre a aula, esse hash é blindado contra qualquer alteração, servindo de prova técnica inquestionável perante auditorias do DETRAN.

### 🕒 4. Regra dos 50 Minutos & Custódia (Escrow)
* O saldo financeiro da aula prática só é elegível para liberação ao instrutor (remessa da conta Escrow) se a aula tiver durado, no mínimo, **50 minutos** de atividade real computada entre o check-in e o check-out.
* Um worker recorrente automático audita diariamente a regularidade das CNHs de todos os instrutores cadastrados. Caso a CNH expire ou apresente irregularidade, o instrutor é preventivamente alterado para `isActive: false`, bloqueando novas agendas.

### 📜 5. Motor OCR de LADV via Tesseract.js
O upload da Licença de Aprendizagem de Direção Veicular (LADV) passa por um processamento de imagem automatizado que realiza a extração do texto do documento. O sistema exige uma taxa de confiança mínima de **50%** e a detecção de termos governamentais obrigatórios para validação automática, do contrário, a licença é retida em fila para auditoria manual pela administração.

---

## 🏗️ Arquitetura Técnica

A plataforma adota uma abordagem de **Monolito Modular** bem definida, o que permite o desenvolvimento isolado e robusto de cada domínio com alta coesão e baixo acoplamento:

```
src/
├── main.ts                   # Ponto de entrada do NestJS com configurações globais
├── app.module.ts             # Módulo raiz orquestrador
├── common/                   # DTOs, filtros de erro globais e guards reutilizáveis
└── modules/                  # Domínios de negócio isolados
    ├── auth/                 # Registro, Login e JWT
    ├── students/             # Gestão cadastral de alunos
    ├── instructors/          # Gestão cadastral e reputação de instrutores
    ├── vehicles/             # Frota de veículos vinculada às aulas
    ├── availability/         # Agendas bases de disponibilidade dos instrutores
    ├── busy-slots/           # Bloqueios e exceções na agenda de instrutores
    ├── lessons/              # Ciclo de vida da aula, telemetria, biometria e hash
    ├── journey/              # Máquina de estados regulatória da CNH
    ├── ladv-process/         # Motor de inteligência artificial OCR da LADV
    ├── academy/              # Velo Academy (Simulados da prova do DETRAN)
    ├── payments-stripe/      # Faturamento, carteiras e transações via Stripe
    └── compliance/           # Workers e rotinas de conformidade legislativa
```

---

## 🛠️ Guia de Início Rápido (Setup Local)

### Pré-requisitos
* [Node.js](https://nodejs.org/) (Recomendado v20.x ou superior)
* Banco de Dados PostgreSQL (Local ou instância na [Neon DB](https://neon.tech/))

### 1. Clonar e Configurar Dependências
```bash
# Instalar as dependências do projeto
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como modelo):
```env
DATABASE_URL="postgresql://usuario:senha@host:porta/banco?schema=public"
JWT_SECRET="sua_chave_secreta_jwt_aqui"
ADMIN_API_KEY="chave_admin_minimo_16_chars"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
# Opcionais
PORT=3001
ENABLE_TEST_MODE=false
DOCUMENT_VALIDATION_PROVIDER=mock
PLATFORM_FEE_PERCENT=20
```

> [!NOTE]  
> A Velo API está integrada ao Neon DB utilizando pooling de conexões otimizado pelo Prisma Client. Certifique-se de preencher a `DATABASE_URL` com os dados corretos.

### 3. Preparação do Banco de Dados e Carga de Dados (Seed)
```bash
# Executar as migrations para criar a estrutura de tabelas no Neon DB
npx prisma migrate dev

# Popular o banco com dados iniciais (simulados, questões do simulado, etc.)
npm run seed
```
*(Nota: O script de Seed populará automaticamente o banco de dados com uma base inicial de 30 questões estruturadas para o simulado da Velo Academy).*

### 4. Executar a Aplicação
```bash
# Modo de desenvolvimento (com hot-reload)
npm run start:dev

# Modo de produção
npm run build
npm run start:prod
```

> [!IMPORTANT]  
> **Observação sobre o OCR da LADV:** O projeto utiliza o Tesseract.js para processamento local de OCR em português. Para garantir o funcionamento offline estável e máxima velocidade nas validações locais de LADV, o arquivo de treinamento oficial de idioma `por.traineddata` já se encontra persistido na raiz do projeto. O motor de OCR está configurado para consumir este binário diretamente, evitando requisições adicionais à internet durante a etapa de leitura do documento.

---

## 📚 Mapa de Endpoints & Referência da API

Com a aplicação em execução local, você pode acessar a documentação interativa completa gerada pelo **Swagger UI** no link:
👉 [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

### Endpoints Críticos para Integração do Frontend:

* **Módulo Aluno & Jornada:**
  * `POST /students` - Cadastro de novos alunos.
  * `POST /ladv/me/upload` - Upload e disparo do motor OCR de LADV.
  * `GET /students/:id/checklist` - Consulta das etapas burocráticas concluídas perante a Jornada CNH.
  * `GET /academy/simulado` - Geração de prova contendo 30 questões dinâmicas de trânsito.

* **Módulo Aula (Lessons) & Telemetria:**
  * `POST /lessons` - Solicitação de agendamento de aula (com verificação de pré-requisitos).
  * `POST /lessons/:id/check-in` - Início da aula (marca carimbo de tempo inicial e biometria).
  * `POST /lessons/:id/biometry` - Registro de biometria facial nos 3 tempos da aula.
  * `POST /lessons/:id/check-out` - Término da aula (computa tempo mínimo de 50 minutos, calcula telemetria, gera o `integrityHash` SHA-256 e agenda a liberação dos fundos).

* **Módulo Financeiro & Disputas:**
  * `POST /disputes/:lessonId/open` - Abertura de contestações financeiras pelo aluno em até 48 horas pós-aula.

---

## 🧪 Suíte de Testes & Qualidade de Código

O projeto conta com testes unitários e de integração baseados em Jest para garantir que nenhuma transição da máquina de estados ou trava regulatória de agendamento seja quebrada durante manutenções.

```bash
# Executar todos os testes unitários
npm run test

# Executar testes em tempo real (Watch Mode)
npm run test:watch

# Gerar relatório detalhado de cobertura de testes (Coverage)
npm run test:cov
```

---

## 📖 Documentação de Apoio Externa

Para mergulhar em detalhes arquiteturais adicionais, consulte os guias estruturados na pasta `/docs`:
1. [Arquitetura do Sistema](./docs/architecture.md) — Filosofia técnica e decisões de design.
2. [Regras de Negócio e Compliance](./docs/business-logic.md) — Explicação minuciosa da conformidade com a Resolução CONTRAN 1.020/2025.
3. [Referência Detalhada da API](./docs/api-reference.md) — Payload de requests/responses e status HTTP.
4. [Modelo Físico de Dados](./docs/database.md) — Detalhes das entidades do Prisma e relacionamentos.
5. [Fluxo e Funcionalidades Globais](./docs/FLOW_AND_FEATURES.md) — Visão ponta a ponta do comportamento do Aluno e do Instrutor.
