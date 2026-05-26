# Regras de Negócio e Compliance — Resolução CONTRAN 1.020/2025

## Visão Geral

A Velo API implementa o fluxo obrigatório de habilitação de motorista conforme a **Resolução CONTRAN 1.020/2025**. A jornada do aluno é uma máquina de estados sequencial: cada etapa só é liberada após a anterior ser concluída e validada.

---

## Máquina de Estados da Jornada (JourneyModule)

### Estágios em Ordem

```
REGISTERED
  └─► THEORY_COURSE_IN_PROGRESS   (theoryCourseStartedAt definido)
        └─► RENACH_PENDING          (RENACH criado mas status != DONE)
              └─► MEDICAL_PENDING   (RENACH = DONE, exame médico não válido)
                    └─► PSYCH_PENDING   (exame médico válido, psicotécnico não válido)
                          └─► THEORY_EXAM_PENDING   (psicotécnico válido)
                                └─► AWAITING_LADV_UPLOAD   (exame teórico oficial aprovado)
                                      └─► LADV_UPLOADED_VALID   (LADV com OCR = PASS e vigente)
                                            └─► PRACTICAL_IN_PROGRESS   (>0 aulas concluídas válidas)
                                                  └─► READY_FOR_PRACTICAL_EXAM   (≥120 min válidos + declaração)
```

### Regras de Transição

| De | Para | Condição |
|----|------|---------|
| REGISTERED | THEORY_COURSE_IN_PROGRESS | `theoryCourseStartedAt` preenchido |
| THEORY_COURSE_IN_PROGRESS | RENACH_PENDING | RenachProcess existe e status ≠ `DONE` |
| RENACH_PENDING | MEDICAL_PENDING | `renach.status = DONE` e exame médico não válido |
| MEDICAL_PENDING | PSYCH_PENDING | Exame médico válido (`isValidLaudo = true`) |
| PSYCH_PENDING | THEORY_EXAM_PENDING | Exame psicotécnico válido (`isValidLaudo = true`) |
| THEORY_EXAM_PENDING | AWAITING_LADV_UPLOAD | `officialTheoryExam.passed = true` |
| AWAITING_LADV_UPLOAD | LADV_UPLOADED_VALID | `isLadvValid = true` |
| LADV_UPLOADED_VALID | PRACTICAL_IN_PROGRESS | Total de aulas concluídas válidas > 0 |
| PRACTICAL_IN_PROGRESS | READY_FOR_PRACTICAL_EXAM | `meetsMinimumLegal = true` **e** `readyForPracticalExamAt` definido |

### Definição de Laudo Válido (`isValidLaudo`)

Um laudo médico ou psicotécnico é considerado válido quando:
- `status = RESULT_UPLOADED`
- `result` ∈ `{APTO, APTO_COM_RESTRICOES}`
- `validUntil` > hoje

### Definição de LADV Válida (`isLadvValid`)

- `ladvNumber` preenchido
- `ladvOcrStatus = PASS`
- `ladvValidUntil` > hoje

### Bloqueadores

Condições que impedem a progressão mesmo que os pré-requisitos anteriores sejam cumpridos:

| Bloqueador | Causa |
|-----------|-------|
| `MEDICAL_EXAM_EXPIRED` | `validUntil` do exame médico expirou |
| `PSYCHOLOGICAL_EXAM_EXPIRED` | `validUntil` do psicotécnico expirou |
| `THEORY_EXAM_FAILED` | Exame teórico com `passed = false` |
| `LADV_EXPIRED` | `ladvValidUntil` expirado |

> Após qualquer mutação em `RenachProcess`, `MedicalExam`, `PsychologicalExam`, `OfficialTheoryExam` ou `theoryCourseStartedAt`, chamar `JourneyService.refresh(studentId)` para recalcular e persistir o `journeyStage`.

---

## Etapas Detalhadas

### Etapa 1 — Registro e Início do Curso Teórico
O aluno se registra e aceita os termos. O campo `theoryCourseStartedAt` é definido para mover o aluno para `THEORY_COURSE_IN_PROGRESS`.

### Etapa 2 — RENACH (RenachProcessModule)
- Aluno declara o número RENACH por UF (`ufDetran`, `renachNumber`).
- Quando a biometria no DETRAN é realizada, `status` muda para `DONE` e `biometryDoneAt` é registrado.

### Etapa 3 — Exame Médico (MedicalExamModule)
- Aluno agenda em clínica do catálogo (tipo `MEDICO`).
- Após realização, laudo é enviado via upload com `protocolCode` gerado automaticamente.
- Resultado possível: `APTO`, `APTO_COM_RESTRICOES`, `INAPTO`.
- Laudo tem validade (`validUntil`) — se expirar, o aluno bloqueia em `MEDICAL_PENDING` novamente.

### Etapa 4 — Exame Psicotécnico (PsychologicalExamModule)
- Fluxo idêntico ao médico, com clínicas do tipo `PSICOLOGICO`.
- Ambos os laudos precisam estar válidos simultaneamente para avançar.

### Etapa 5 — Exame Teórico Oficial (TheoryExamOfficialModule)
- Aluno auto-declara a realização do exame teórico no DETRAN.
- Campos: `takenAt`, `score`, `passed`, `proofUrl`.
- Apenas `passed = true` libera a próxima etapa.

### Etapa 6 — LADV (LadvProcessModule)
- Aluno faz upload do PDF/imagem da LADV (Licença de Aprendizagem de Veículo).
- O Tesseract.js processa o documento:
  - Confiança ≥ 50% + keywords (`LADV`, `LICENÇA`, `APRENDIZAGEM`, `DETRAN`) + número/datas extraídos → `PASS`
  - Sem número ou datas → `NEEDS_REVIEW`
  - Falha técnica → `FAIL`
- Com `ENABLE_TEST_MODE=true`, o header `X-Test-Mode: true` bypassa o OCR (apenas em desenvolvimento/teste).

### Etapa 7 — Aulas Práticas (LessonsModule)

Agendamento permitido apenas a partir do estágio `LADV_UPLOADED_VALID`.

**6 Gates de Validação na criação de aula:**

| # | Gate | Critério |
|---|------|---------|
| 1 | Journey | Estágio do aluno ≥ `LADV_UPLOADED_VALID` |
| 2 | Credencial do instrutor | `credentialStatus = APPROVED` e `credentialValidUntil` no futuro |
| 3 | CNH local | `cnhNumber` válido via `ValidationService` |
| 4 | Validade da CNH | `cnhExpiry` no futuro |
| 5 | CNH SERPRO | Se `DOCUMENT_VALIDATION_PROVIDER=serpro`, consulta a API real |
| 6 | Veículo e conflito | Veículo pertence ao instrutor; sem sobreposição de horário ou `busySlot` |

**Biometria 3 pontos:**
- Momentos: `start` (início), `mid` (meio da aula), `end` (fim).
- Cada ponto exige verificação GPS com raio de 50 m (Haversine) em relação ao último ponto de telemetria.

**Definição de aula válida para fins de compliance:**
- `status = completed`
- `durationMinutes ≥ 50`
- `biometryStartStatus = SUCCESS AND biometryMidStatus = SUCCESS AND biometryEndStatus = SUCCESS`
- `integrityHash ≠ null`
- `disputeOpened = false`

### Etapa 8 — Declaração para Exame Prático
- Com ≥ 120 minutos em aulas válidas, o aluno chama `POST /journey/me/declare-ready-for-exam`.
- `JourneyService.declareReadyForExam` valida o total e registra `readyForPracticalExamAt`.
- Estágio avança para `READY_FOR_PRACTICAL_EXAM`.

---

## Compliance Checklist (ComplianceModule)

| Item | Tipo | Critério |
|------|------|---------|
| `medico` | Manual | Exame médico marcado como concluído |
| `psicotecnico` | Manual | Exame psicotécnico marcado como concluído |
| `teorico` | Derivado | Simulado aprovado (≥ 21/30 em ≤ 15 min) |
| `pratico` | Derivado | ≥ 120 minutos em aulas válidas |

O `ComplianceService` sincroniza automaticamente os itens derivados ao gerar o relatório.

---

## Simulado (AcademyModule)

- 30 questões aleatórias do banco de questões.
- Tempo máximo: 15 minutos.
- Aprovação: ≥ 21 acertos (70%).
- Histórico em `StudentSimuladoHistory`; item `teorico` do checklist atualizado automaticamente.

---

## Pagamentos e Escrow (PaymentsStripeModule)

### Fluxo

```
Aluno agenda aula (pending_acceptance)
  └─► Instrutor aceita → charge() → fundos HELD na plataforma Stripe
        └─► Aula concluída + válida → releaseEscrow() → transfer para conta Connect do instrutor
              └─► Em caso de disputa → admin decide: release ou refund
```

### Status de Pagamento

| Status | Significado |
|--------|------------|
| `PENDING` | PaymentIntent criado, aguardando confirmação via webhook |
| `HELD` | Fundos retidos na plataforma (aula não concluída) |
| `RELEASED` | Transfer realizada para o instrutor |
| `FAILED` | Falha no pagamento |
| `RELEASE_FAILED` | Transfer falhou após aula concluída |
| `REFUNDED` | Reembolso emitido |

### Divisão de Valores
- Taxa de plataforma: `PLATFORM_FEE_PERCENT` (padrão 20%).
- Valor do instrutor: `lesson.price × (1 − platformFeePercent / 100)`.

### Pré-requisitos para Release
1. `payment.status = HELD`
2. `lesson.status = completed`
3. `lesson.durationMinutes ≥ 50`
4. Todos os 3 biometria = `SUCCESS`
5. `lesson.integrityHash ≠ null`
6. `lesson.disputeOpened = false`
7. Instrutor com `stripeAccountStatus = ACTIVE`

### Hash de Integridade
Após o checkout, o `ShieldService` gera um SHA-256 dos dados da aula (telemetria inclusa) e armazena em `integrityHash`. Uma vez que `disputeOpened = true`, o hash torna-se imutável.

---

## Telemetria (TelemetriaModule)

| Evento | Tipo |
|--------|------|
| Excesso de velocidade | `SPEED_LIMIT` |
| Frenagem brusca | `HARSH_BRAKING` |
| Desvio de rota | `ROUTE_DEVIATION` |
| Motor ligado/desligado | `ENGINE_ON` / `ENGINE_OFF` |

Eventos ficam em `LessonEvent` e `LessonTelemetry`, vinculados à aula, e integram o hash de integridade.
