# Regras de Negócio e Compliance

O sistema foi projetado para atender à **Resolução CONTRAN 1.020/2025**.

## 🛡️ Escudo de Integridade (Caixa Preta)
Ao fim de cada aula, o sistema concatena todos os pontos de telemetria (lat, lng, velocidade, timestamp) e gera um hash **SHA-256**.
- Este hash é imutável.
- Se uma disputa for aberta, o hash e a telemetria ficam bloqueados para edição.

## 📸 Biometria em 3 Tempos
A presença do aluno e instrutor é validada em três momentos:
1. **Início**: Para liberar a ignição virtual.
2. **Aleatório (Mid)**: Durante o percurso.
3. **Fim**: Para validar o checkout.
- **Geofencing**: A biometria só é aceita se o GPS estiver em um raio de 50 metros da última telemetria válida.

## 🕒 Regra dos 50 Minutos
Para fins de faturamento e liberação de fundos no sistema de Escrow:
- O pagamento só é liberado para o instrutor se a aula tiver duração mínima de **50 minutos**.
- Instrutores com CNH vencida são bloqueados diariamente por um **Worker automático** e não podem receber novos pagamentos.

## 📜 Validação de LADV
O upload da Licença de Aprendizagem passa por um motor de OCR:
- Requer taxa de confiança > 80% (ou marca para revisão manual).
- Valida palavras-chave obrigatórias do documento oficial.
