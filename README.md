# Velo API - Sistema de Gestão de Autoescolas

Bem-vindo à documentação oficial da **Velo API**. Este projeto foi desenvolvido para modernizar o processo de aprendizagem em autoescolas, garantindo segurança jurídica e conformidade com as resoluções do CONTRAN.

## 🚀 Tecnologias Utilizadas
- **Framework**: NestJS (Node.js)
- **Banco de Dados**: PostgreSQL (Hospedado na Neon DB)
- **ORM**: Prisma
- **Processamento de Imagem**: Tesseract.js (OCR de LADV)
- **Pagamentos**: Asaas (Escrow e Webhooks)
- **Segurança**: SHA-256 para integridade de telemetria

## 📚 Estrutura da Documentação
1. [Arquitetura do Sistema](./docs/architecture.md) - Visão técnica e decisões de design.
2. [Referência da API](./docs/api-reference.md) - Endpoints, parâmetros e retornos.
3. [Regras de Negócio e Compliance](./docs/business-logic.md) - Detalhes sobre CONTRAN 1.020/2025.
4. [Modelo de Dados](./docs/database.md) - Entidades e relacionamentos do banco de dados.

## 🛠️ Como Iniciar
```bash
# Instalar dependências
npm install

# Configurar o banco de dados
npx prisma generate
npx prisma db push

# Rodar o projeto
npm run start:dev
```
