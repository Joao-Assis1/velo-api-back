-- Indexes para queries de aulas e pagamentos por aluno (evita sequential scan)
CREATE INDEX "Lesson_studentId_idx" ON "Lesson"("studentId");
CREATE INDEX "Lesson_studentId_status_idx" ON "Lesson"("studentId", "status");
CREATE INDEX "Payment_studentId_idx" ON "Payment"("studentId");
