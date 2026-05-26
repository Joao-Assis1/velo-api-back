'use strict';
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const outputPath = path.join(assetsDir, 'test-ladv.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 60 });
doc.pipe(fs.createWriteStream(outputPath));

doc.fontSize(24).font('Helvetica-Bold')
  .text('LICENCA DE APRENDIZAGEM DE DIRECAO VEICULAR', { align: 'center' });
doc.fontSize(20).text('LADV', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(16).font('Helvetica')
  .text('DETRAN-MS  -  Departamento Estadual de Transito de Mato Grosso do Sul', { align: 'center' });
doc.fontSize(14).text('www.meudetran.ms.gov.br', { align: 'center' });
doc.moveDown(1.5);

doc.fontSize(18).font('Helvetica-Bold').text('NUMERO: LADV MS-2026-001234');
doc.moveDown(0.5);

doc.fontSize(16).font('Helvetica').text('TITULAR: PROFESSOR DEMO VELO');
doc.moveDown(0.3);
doc.fontSize(16).text('CPF: 000.000.000-00');
doc.moveDown(0.3);
doc.fontSize(16).text('MUNICIPIO: CAMPO GRANDE / MS');
doc.moveDown(0.3);
doc.fontSize(16).text('CATEGORIA PRETENDIDA: B');
doc.moveDown(1.2);

const today = new Date();
const pad = (n) => String(n).padStart(2, '0');
const emissaoStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

const valid = new Date(today);
valid.setFullYear(valid.getFullYear() + 2);
const validStr = `${pad(valid.getDate())}/${pad(valid.getMonth() + 1)}/${valid.getFullYear()}`;

doc.fontSize(18).font('Helvetica-Bold').text(`EMISSAO: ${emissaoStr}`);
doc.moveDown(0.5);
doc.fontSize(18).font('Helvetica-Bold').text(`VALIDADE: ${validStr}`);
doc.moveDown(1.5);

doc.fontSize(12).font('Helvetica')
  .text('Documento emitido em conformidade com o CONTRAN 1.020/2025 e legislacao de transito vigente.');
doc.moveDown(0.3);
doc.fontSize(12).text('Este documento e valido apenas para fins de aprendizagem de direcao veicular autorizada pelo DETRAN-MS.');

doc.end();
console.log(`LADV de teste gerado em: ${outputPath}`);
console.log(`Emissao: ${emissaoStr}  |  Validade: ${validStr}`);
