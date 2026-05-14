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

## 🛣️ Journey do Aluno (Resolução CONTRAN 1.020/2025)

O processo de obtenção da 1ª CNH categoria B é modelado como uma máquina de estados em `src/modules/journey/`. Cada aluno tem um campo `journeyStage` no banco que reflete sua etapa atual.

### Stages (em ordem):

1. `REGISTERED` — cadastro inicial concluído
2. `THEORY_COURSE_IN_PROGRESS` — aluno declarou início do curso teórico (EAD oficial)
3. `RENACH_PENDING` — aguardando abertura de processo no DETRAN
4. `MEDICAL_PENDING` — aguardando laudo médico APTO válido
5. `PSYCH_PENDING` — aguardando laudo psicológico APTO válido
6. `THEORY_EXAM_PENDING` — pronto para o exame teórico oficial no DETRAN
7. `AWAITING_LADV_UPLOAD` — passou no teórico, aguardando upload da LADV
8. `LADV_UPLOADED_VALID` — LADV válida, libera agendamento de aulas práticas
9. `PRACTICAL_IN_PROGRESS` — pelo menos uma aula prática válida concluída
10. `READY_FOR_PRACTICAL_EXAM` — cumpriu ≥ 2h-aula CONTRAN + se autodeclarou pronto

### Regras de transição:

- A função pura `computeStageFromData()` é a única fonte de verdade.
- `Student.journeyStage` é apenas cache para listagens admin.
- Aulas práticas exigem `stage >= LADV_UPLOADED_VALID` (gate em `LessonsService.create()` via `JourneyService.assertCanScheduleLesson()`).
- O sistema NÃO emite CNH nem processa o exame prático — o estado terminal é `READY_FOR_PRACTICAL_EXAM`.
