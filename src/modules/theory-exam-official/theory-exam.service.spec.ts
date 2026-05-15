import { Test, TestingModule } from '@nestjs/testing';
import { TheoryExamOfficialService } from './theory-exam.service';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';

describe('TheoryExamOfficialService', () => {
  let service: TheoryExamOfficialService;
  let prisma: {
    officialTheoryExam: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let journey: { refresh: jest.Mock };

  beforeEach(async () => {
    prisma = {
      officialTheoryExam: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    journey = {
      refresh: jest.fn().mockResolvedValue({ stage: 'AWAITING_LADV_UPLOAD' }),
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        TheoryExamOfficialService,
        { provide: PrismaService, useValue: prisma },
        { provide: JourneyService, useValue: journey },
      ],
    }).compile();
    service = mod.get(TheoryExamOfficialService);
  });

  it('record passed=true refreshes journey to AWAITING_LADV_UPLOAD', async () => {
    prisma.officialTheoryExam.upsert.mockResolvedValue({
      id: 'e1',
      passed: true,
      takenAt: new Date('2026-06-15'),
      score: 26,
    });
    const r = await service.record(
      'stu-1',
      {
        takenAt: new Date('2026-06-15'),
        passed: true,
        score: 26,
      },
      null,
    );
    expect(prisma.officialTheoryExam.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: 'stu-1' },
        create: expect.objectContaining({
          studentId: 'stu-1',
          passed: true,
          score: 26,
        }),
      }),
    );
    expect(journey.refresh).toHaveBeenCalledWith('stu-1');
    expect(r.passed).toBe(true);
  });

  it('record passed=false stores the attempt and journey stays at THEORY_EXAM_PENDING', async () => {
    journey.refresh.mockResolvedValue({ stage: 'THEORY_EXAM_PENDING' });
    prisma.officialTheoryExam.upsert.mockResolvedValue({
      id: 'e1',
      passed: false,
      takenAt: new Date('2026-06-15'),
      score: 19,
    });
    const r = await service.record(
      'stu-1',
      {
        takenAt: new Date('2026-06-15'),
        passed: false,
        score: 19,
      },
      null,
    );
    expect(r.passed).toBe(false);
    expect(journey.refresh).toHaveBeenCalledWith('stu-1');
  });

  it('record stores proofUrl when file is provided', async () => {
    prisma.officialTheoryExam.upsert.mockResolvedValue({
      id: 'e1',
      passed: true,
      takenAt: new Date(),
      proofUrl: '/uploads/theory-exam/stu-1/p.pdf',
    });
    await service.record(
      'stu-1',
      {
        takenAt: new Date(),
        passed: true,
      },
      '/uploads/theory-exam/stu-1/p.pdf',
    );
    expect(prisma.officialTheoryExam.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          proofUrl: '/uploads/theory-exam/stu-1/p.pdf',
        }),
      }),
    );
  });

  it('getMine returns the stored record or null', async () => {
    prisma.officialTheoryExam.findUnique.mockResolvedValue({
      id: 'e1',
      passed: true,
    });
    const r = await service.getMine('stu-1');
    expect(r?.id).toBe('e1');
  });
});
