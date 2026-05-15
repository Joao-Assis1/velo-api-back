import { buildProtocolPdf, ProtocolPdfInput } from './protocol-pdf';

describe('buildProtocolPdf', () => {
  it('returns a Buffer with PDF magic bytes', async () => {
    const input: ProtocolPdfInput = {
      protocolCode: 'MED-2026-12345',
      studentName: 'João Silva',
      examType: 'Exame médico — 1ª CNH',
      clinicName: 'Clínica Avenida Paulista',
      clinicAddress: 'Av. Paulista, 1000',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
    };
    const buf = await buildProtocolPdf(input);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(500);
  });

  it('handles missing clinic info gracefully', async () => {
    const input: ProtocolPdfInput = {
      protocolCode: 'MED-2026-00001',
      studentName: 'Aluno X',
      examType: 'Exame médico',
      clinicName: null,
      clinicAddress: null,
      scheduledAt: null,
    };
    const buf = await buildProtocolPdf(input);
    expect(buf.length).toBeGreaterThan(100);
  });
});
