import PDFDocument from 'pdfkit';

export interface ProtocolPdfInput {
  protocolCode: string;
  studentName: string;
  examType: string;
  clinicName: string | null;
  clinicAddress: string | null;
  scheduledAt: Date | null;
}

export function buildProtocolPdf(input: ProtocolPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Protocolo de Agendamento', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Tipo: ${input.examType}`);
    doc.text(`Protocolo: ${input.protocolCode}`);
    doc.text(`Aluno: ${input.studentName}`);
    doc.moveDown();

    if (input.clinicName) {
      doc.text(`Clínica: ${input.clinicName}`);
    }
    if (input.clinicAddress) {
      doc.text(`Endereço: ${input.clinicAddress}`);
    }
    if (input.scheduledAt) {
      doc.text(`Data agendada: ${input.scheduledAt.toLocaleString('pt-BR')}`);
    }
    doc.moveDown();
    doc.fontSize(10).text(
      'Apresente este protocolo na clínica no dia do exame. ' +
        'Velo — Resolução CONTRAN 1.020/2025.',
      { align: 'left' },
    );
    doc.end();
  });
}
