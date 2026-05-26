import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MedicalExamService } from './medical-exam.service';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';

describe('MedicalExamService', () => {
  let service: MedicalExamService;
  let prisma: {
    medicalExam: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    clinic: { findUnique: jest.Mock };
    student: { findUnique: jest.Mock };
  };
  let journey: { refresh: jest.Mock };

  beforeEach(async () => {
    prisma = {
      medicalExam: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      clinic: { findUnique: jest.fn() },
      student: { findUnique: jest.fn() },
    };
    journey = { refresh: jest.fn().mockResolvedValue({ stage: 'PSYCH_PENDING' }) };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalExamService,
        { provide: PrismaService, useValue: prisma },
        { provide: JourneyService, useValue: journey },
      ],
    }).compile();
    service = mod.get(MedicalExamService);
  });

  describe('schedule', () => {
    it('rejects when clinic is not MEDICAL or inactive', async () => {
      prisma.clinic.findUnique.mockResolvedValue({
        id: 'c1',
        type: 'PSYCHOLOGICAL',
        isActive: true,
      });
      await expect(
        service.schedule('stu-1', { clinicId: 'c1', scheduledAt: new Date() }),
      ).rejects.toThrow(BadRequestException);
    });

    it('generates a protocolCode and upserts SCHEDULED', async () => {
      prisma.clinic.findUnique.mockResolvedValue({
        id: 'c1',
        type: 'MEDICAL',
        isActive: true,
      });
      prisma.medicalExam.upsert.mockImplementation(({ create, update }) =>
        Promise.resolve({ id: 'e1', ...create, ...update }),
      );
      const r = await service.schedule('stu-1', {
        clinicId: 'c1',
        scheduledAt: new Date('2026-06-01T10:00:00Z'),
      });
      expect(r.protocolCode).toMatch(/^MED-\d{4}-[A-Z0-9]{6}$/);
      expect(prisma.medicalExam.upsert).toHaveBeenCalled();
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
    });
  });

  describe('uploadLaudo', () => {
    it('updates with APTO + validUntil and refreshes journey', async () => {
      prisma.medicalExam.findUnique.mockResolvedValue({
        id: 'e1',
        studentId: 'stu-1',
        protocolCode: 'MED-2026-AAA111',
        status: 'SCHEDULED',
      });
      prisma.medicalExam.update.mockResolvedValue({
        id: 'e1',
        studentId: 'stu-1',
        protocolCode: 'MED-2026-AAA111',
        status: 'RESULT_UPLOADED',
        result: 'APTO',
        validUntil: new Date('2027-06-01'),
      });
      const r = await service.uploadLaudo(
        'stu-1',
        {
          result: 'APTO',
          validUntil: new Date('2027-06-01'),
        },
        '/uploads/medical/stu-1/laudo.pdf',
      );
      expect(prisma.medicalExam.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: expect.objectContaining({
          status: 'RESULT_UPLOADED',
          result: 'APTO',
          laudoUrl: '/uploads/medical/stu-1/laudo.pdf',
          performedAt: expect.any(Date),
        }),
      });
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
      expect(r.status).toBe('RESULT_UPLOADED');
    });

    it('rejects when validUntil is in the past', async () => {
      prisma.medicalExam.findUnique.mockResolvedValue({
        id: 'e1',
        studentId: 'stu-1',
        status: 'SCHEDULED',
      });
      await expect(
        service.uploadLaudo(
          'stu-1',
          {
            result: 'APTO',
            validUntil: new Date('2020-01-01'),
          },
          '/uploads/medical/stu-1/laudo.pdf',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when no exam to upload laudo to', async () => {
      prisma.medicalExam.findUnique.mockResolvedValue(null);
      await expect(
        service.uploadLaudo(
          'stu-1',
          { result: 'APTO', validUntil: new Date('2027-06-01') },
          '/path',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('buildProtocolPdfBuffer', () => {
    it('throws NotFoundException when no exam exists', async () => {
      prisma.medicalExam.findUnique.mockResolvedValue(null);
      await expect(service.buildProtocolPdfBuffer('stu-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns a Buffer with PDF magic bytes', async () => {
      prisma.medicalExam.findUnique.mockResolvedValue({
        id: 'e1',
        protocolCode: 'MED-2026-AAA111',
        scheduledAt: new Date('2026-06-01T10:00:00Z'),
        clinic: { name: 'Clínica X', address: 'Rua A, 1' },
      });
      prisma.student.findUnique.mockResolvedValue({ name: 'João' });

      const buf = await service.buildProtocolPdfBuffer('stu-1');
      expect(buf.slice(0, 4).toString()).toBe('%PDF');
    });
  });
});
