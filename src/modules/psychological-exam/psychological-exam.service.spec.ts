import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PsychologicalExamService } from './psychological-exam.service';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';

describe('PsychologicalExamService', () => {
  let service: PsychologicalExamService;
  let prisma: {
    psychologicalExam: {
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
      psychologicalExam: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      clinic: { findUnique: jest.fn() },
      student: { findUnique: jest.fn() },
    };
    journey = {
      refresh: jest.fn().mockResolvedValue({ stage: 'THEORY_EXAM_PENDING' }),
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        PsychologicalExamService,
        { provide: PrismaService, useValue: prisma },
        { provide: JourneyService, useValue: journey },
      ],
    }).compile();
    service = mod.get(PsychologicalExamService);
  });

  it('schedule rejects when clinic is MEDICAL', async () => {
    prisma.clinic.findUnique.mockResolvedValue({
      id: 'c1',
      type: 'MEDICAL',
      isActive: true,
    });
    await expect(
      service.schedule('stu-1', { clinicId: 'c1', scheduledAt: new Date() }),
    ).rejects.toThrow(BadRequestException);
  });

  it('schedule generates PSY-* protocol code', async () => {
    prisma.clinic.findUnique.mockResolvedValue({
      id: 'c1',
      type: 'PSYCHOLOGICAL',
      isActive: true,
    });
    prisma.psychologicalExam.upsert.mockImplementation(({ create, update }) =>
      Promise.resolve({ id: 'e1', ...create, ...update }),
    );
    const r = await service.schedule('stu-1', {
      clinicId: 'c1',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
    });
    expect(r.protocolCode).toMatch(/^PSY-\d{4}-[A-Z0-9]{6}$/);
    expect(journey.refresh).toHaveBeenCalledWith('stu-1');
  });

  it('uploadLaudo with APTO refreshes journey to THEORY_EXAM_PENDING', async () => {
    prisma.psychologicalExam.findUnique.mockResolvedValue({
      id: 'e1',
      studentId: 'stu-1',
      status: 'SCHEDULED',
    });
    prisma.psychologicalExam.update.mockResolvedValue({
      id: 'e1',
      status: 'RESULT_UPLOADED',
      result: 'APTO',
    });
    await service.uploadLaudo(
      'stu-1',
      {
        result: 'APTO',
        validUntil: new Date(Date.now() + 365 * 86400000),
      },
      '/uploads/psychological/stu-1/laudo.pdf',
    );
    expect(journey.refresh).toHaveBeenCalledWith('stu-1');
  });

  it('uploadLaudo rejects expired validUntil', async () => {
    prisma.psychologicalExam.findUnique.mockResolvedValue({
      id: 'e1',
      studentId: 'stu-1',
      status: 'SCHEDULED',
    });
    await expect(
      service.uploadLaudo(
        'stu-1',
        { result: 'APTO', validUntil: new Date('2020-01-01') },
        '/p',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('uploadLaudo throws when no exam exists', async () => {
    prisma.psychologicalExam.findUnique.mockResolvedValue(null);
    await expect(
      service.uploadLaudo(
        'stu-1',
        { result: 'APTO', validUntil: new Date(Date.now() + 86400000) },
        '/p',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('buildProtocolPdfBuffer returns PDF magic bytes', async () => {
    prisma.psychologicalExam.findUnique.mockResolvedValue({
      id: 'e1',
      protocolCode: 'PSY-2026-AAA111',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      clinic: { name: 'Psico X', address: 'Rua A, 1' },
    });
    prisma.student.findUnique.mockResolvedValue({ name: 'João' });
    const buf = await service.buildProtocolPdfBuffer('stu-1');
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });
});
