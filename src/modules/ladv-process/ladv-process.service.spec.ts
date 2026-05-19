import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LadvProcessService } from './ladv-process.service';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';

jest.mock('tesseract.js', () => ({
  recognize: jest.fn(),
}));
import * as Tesseract from 'tesseract.js';

describe('LadvProcessService', () => {
  let service: LadvProcessService;
  let prisma: {
    student: { findUnique: jest.Mock; update: jest.Mock };
  };
  let journey: { refresh: jest.Mock };

  beforeEach(async () => {
    prisma = {
      student: { findUnique: jest.fn(), update: jest.fn() },
    };
    journey = {
      refresh: jest.fn().mockResolvedValue({ stage: 'LADV_UPLOADED_VALID' }),
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        LadvProcessService,
        { provide: PrismaService, useValue: prisma },
        { provide: JourneyService, useValue: journey },
      ],
    }).compile();
    service = mod.get(LadvProcessService);
    (Tesseract.recognize as jest.Mock).mockReset();
  });

  describe('getGuide', () => {
    it('returns MS-specific instructions for the official CNH do Brasil app', () => {
      const g = service.getGuide('MS');
      expect(g.uf).toBe('MS');
      expect(
        g.steps.some((s) => /cnh do brasil|detran-ms/i.test(s)),
      ).toBe(true);
    });

    it('returns generic fallback for any UF that is not MS', () => {
      const g = service.getGuide('SP');
      expect(g.uf).toBe('SP');
      expect(
        g.steps.every((s) => !/detran-ms\.gov\.br/i.test(s)),
      ).toBe(true);
    });
  });

  describe('getMine', () => {
    it('returns canBook=true when status=PASS and validUntil is in the future', async () => {
      prisma.student.findUnique.mockResolvedValue({
        ladvNumber: 'LADV-MS-1',
        ladvIssuedAt: new Date('2026-01-01'),
        ladvValidUntil: new Date(Date.now() + 86400000),
        ladvOcrConfidence: 0.91,
        ladvOcrStatus: 'PASS',
        ladv_document_url: '/uploads/ladv/x.pdf',
        journeyStage: 'LADV_UPLOADED_VALID',
      });
      const r = await service.getMine('stu-1');
      expect(r.canBook).toBe(true);
      expect(r.stage).toBe('LADV_UPLOADED_VALID');
    });

    it('returns canBook=false when validUntil is past', async () => {
      prisma.student.findUnique.mockResolvedValue({
        ladvNumber: 'LADV-MS-1',
        ladvIssuedAt: new Date('2020-01-01'),
        ladvValidUntil: new Date('2020-06-01'),
        ladvOcrConfidence: 0.91,
        ladvOcrStatus: 'PASS',
        ladv_document_url: '/uploads/ladv/x.pdf',
        journeyStage: 'AWAITING_LADV_UPLOAST',
      });
      const r = await service.getMine('stu-1');
      expect(r.canBook).toBe(false);
    });
  });

  describe('uploadFromFile', () => {
    it('saves all five new fields and refreshes journey on PASS', async () => {
      (Tesseract.recognize as jest.Mock).mockResolvedValue({
        data: {
          text:
            'LADV nº LADV-MS-12345678\nLICENÇA DE APRENDIZAGEM DETRAN-MS\nEmitida em 10/05/2026 Válida até 10/11/2030',
          confidence: 85,
        },
      });
      prisma.student.update.mockResolvedValue({});
      prisma.student.findUnique.mockResolvedValue({
        ladvNumber: 'LADV-MS-12345678',
        ladvIssuedAt: new Date('2026-05-10'),
        ladvValidUntil: new Date('2030-11-10'),
        ladvOcrConfidence: 85,
        ladvOcrStatus: 'PASS',
        ladv_document_url: '/uploads/ladv/stu-1/file.pdf',
        journeyStage: 'LADV_UPLOADED_VALID',
      });

      const r = await service.uploadFromFile('stu-1', '/uploads/ladv/stu-1/file.pdf');

      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 'stu-1' },
        data: expect.objectContaining({
          ladvNumber: 'LADV-MS-12345678',
          ladvOcrConfidence: 85,
          ladvOcrStatus: 'PASS',
          ladvUploaded: true,
          ladv_document_url: '/uploads/ladv/stu-1/file.pdf',
        }),
      });
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
      expect(r.ladvOcrStatus).toBe('PASS');
    });

    it('persists NEEDS_REVIEW when number cannot be parsed but keywords match', async () => {
      (Tesseract.recognize as jest.Mock).mockResolvedValue({
        data: {
          text:
            'LICENÇA DE APRENDIZAGEM DETRAN-MS Emitida em 10/05/2026 Válida até 10/11/2030',
          confidence: 80,
        },
      });
      prisma.student.update.mockResolvedValue({});
      prisma.student.findUnique.mockResolvedValue({
        ladvNumber: null,
        ladvIssuedAt: new Date('2026-05-10'),
        ladvValidUntil: new Date('2030-11-10'),
        ladvOcrConfidence: 80,
        ladvOcrStatus: 'NEEDS_REVIEW',
        ladv_document_url: '/uploads/ladv/stu-1/file2.pdf',
        journeyStage: 'AWAITING_LADV_UPLOAD',
      });
      const r = await service.uploadFromFile('stu-1', '/uploads/ladv/stu-1/file2.pdf');
      expect(r.ladvOcrStatus).toBe('NEEDS_REVIEW');
    });

    it('throws BadRequestException with FAIL status when confidence is below 50', async () => {
      (Tesseract.recognize as jest.Mock).mockResolvedValue({
        data: { text: 'qualquer coisa', confidence: 30 },
      });
      await expect(
        service.uploadFromFile('stu-1', '/uploads/ladv/stu-1/bad.pdf'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('saveManual', () => {
    it('persists manual LADV with status=PASS and refreshes journey', async () => {
      prisma.student.update.mockResolvedValue({});
      prisma.student.findUnique.mockResolvedValue({
        ladvNumber: 'LADV-MS-9999',
        ladvIssuedAt: new Date('2026-05-10'),
        ladvValidUntil: new Date('2030-11-10'),
        ladvOcrConfidence: null,
        ladvOcrStatus: 'PASS',
        ladv_document_url: null,
        journeyStage: 'AWAITING_LADV_UPLOAD',
      });
      const r = await service.saveManual('stu-1', {
        ladvNumber: 'LADV-MS-9999',
        ladvIssuedAt: new Date('2026-05-10'),
        ladvValidUntil: new Date('2030-11-10'),
      });
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 'stu-1' },
        data: expect.objectContaining({
          ladvNumber: 'LADV-MS-9999',
          ladvOcrStatus: 'PASS',
          ladvOcrConfidence: null,
        }),
      });
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
      expect(r.ladvOcrStatus).toBe('PASS');
    });

    it('rejects when validUntil is in the past', async () => {
      await expect(
        service.saveManual('stu-1', {
          ladvNumber: 'LADV-MS-9999',
          ladvIssuedAt: new Date('2020-01-01'),
          ladvValidUntil: new Date('2020-06-01'),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
