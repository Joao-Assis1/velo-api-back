# Referência da API

A API segue os princípios REST e utiliza `JwtAuthGuard` para rotas protegidas.

## 👥 Alunos (Students)
- `POST /students`: Cadastro de aluno.
- `POST /students/:id/ladv-upload`: Upload e OCR da LADV.
- `GET /students/:id/checklist`: Status do progresso burocrático.
- `PATCH /students/:id/checklist/:step`: Marcar etapa como concluída.

## 👨‍🏫 Instrutores (Instructors)
- `GET /instructors`: Listagem de instrutores ativos.
- `GET /instructors/:id`: Perfil detalhado e avaliações.

## 🚗 Aulas (Lessons)
- `POST /lessons`: Agendamento de aula.
- `POST /lessons/:id/check-in`: Início da aula (captura timestamp).
- `POST /lessons/:id/check-out`: Fim da aula (gera Hash de integridade e libera pagamento se > 50min).
- `POST /lessons/:id/biometry`: Registro de biometria facial (start, mid, end).

## 🎓 Velo Academy (Simulados)
- `GET /academy/simulado`: Gera prova aleatória com 30 questões.
- `POST /academy/simulado/submit`: Corrige simulado (mínimo 15min de prova).

## 💰 Financeiro (Payments)
- `POST /disputes/:lessonId/open`: Abre contestação de aula (janela de 48h).
- `POST /webhooks/asaas`: Recebimento de confirmações de pagamento.
