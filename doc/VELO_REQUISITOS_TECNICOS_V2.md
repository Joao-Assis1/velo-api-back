# Velo v2 - Especificação Técnica e Requisitos

## 1. Stack Tecnológica Definida
- **Frontend Web:** Next.js + Tailwind CSS + ShadCN (Dashboard de Gestão).
- **Mobile:** Flutter (Perfil Aluno e Instrutor com Geofencing).
- **Backend:** NestJS + Prisma ORM (Arquitetura de Microserviços).
- **Banco de Dados:** Neon.tech (PostgreSQL Serverless).

## 2. Requisitos Funcionais (RF) - v2
- **RF01 (Navegador):** Gestão de checklist burocrático (médico, taxas, LADV).
- **RF02 (Academy):** Simulados teóricos baseados nos Datasets de Dados Abertos do DETRAN.
- **RF03 (Escudo):** Registro de telemetria GPS a cada 30 segundos com geração de Hash SHA-256 ao final da aula.
- **RF04 (Biometria):** Validação facial em 3 tempos durante a aula para conformidade legal.
- **RF05 (Financeiro):** Fluxo de Escrow e mediação de disputas via Sandbox Asaas.

## 3. Requisitos Não Funcionais (RNF) - Qualidade
- **RNF01 (Desempenho):** Processamento de biometria local (face-api.js) em < 2s.
- **RNF02 (Segurança):** Criptografia de ponta a ponta e conformidade total com a LGPD para dados sensíveis (CNH/LADV).
- **RNF03 (Disponibilidade):** Sincronização offline de logs de aula no Flutter.

## 4. Integrações Gratuitas (MVP v2)
- **Biometria:** `face-api.js` (Processamento local/Open-source).
- **OCR Documentos:** `Tesseract.js` (Extração de dados de LADV e CNH).
- **Mapas:** Google Maps Platform (Crédito recorrente de US$ 200/mês).
- **Pagamentos:** Asaas API (Ambiente de Sandbox para testes).

## 5. Próximos Passos (Ciclo de Desenvolvimento)
- Implementação do Worker de verificação diária de validade de credenciais.
- Desenvolvimento da lógica de "Caixa Preta" (Hash de Telemetria) para proteção jurídica.
