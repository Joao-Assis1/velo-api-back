import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  student: { findUnique: jest.fn() },
  studentChecklist: { upsert: jest.fn(), update: jest.fn() },
  studentSimuladoHistory: { findFirst: jest.fn() },
  lesson: { findMany: jest.fn() },
};

const makeLesson = (id: string) => ({
  id,
  date: new Date(),
  durationMinutes: 60,
});

describe('ComplianceService', () => {
  let service: ComplianceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
  });

  describe('getComplianceReport', () => {
    it('throws NotFoundException when student does not exist', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);
      await expect(service.getComplianceReport('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('reports ladvValid true when ladvOcrStatus PASS even if ladvUploaded is false (seed scenario)', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 's1',
        name: 'Ana',
        ladvNumber: 'LADV-SP-67890',
        ladvOcrStatus: 'PASS',
        ladvValidUntil: new Date(Date.now() + 86400000 * 365),
        ladvUploaded: false,
      });
      mockPrisma.studentChecklist.upsert.mockResolvedValue({
        studentId: 's1',
        medico: false,
        psicotecnico: false,
        teorico: false,
        pratico: false,
      });
      mockPrisma.studentSimuladoHistory.findFirst.mockResolvedValue(null);
      mockPrisma.lesson.findMany.mockResolvedValue([]);

      const report = await service.getComplianceReport('s1');

      expect(report.ladvValid).toBe(true);
    });

    it('returns all steps false when no data exists', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 's1',
        name: 'Ana',
        ladvUploaded: false,
        ladvNumber: null,
        ladvOcrStatus: null,
        ladvValidUntil: null,
      });
      mockPrisma.studentChecklist.upsert.mockResolvedValue({
        studentId: 's1',
        medico: false,
        psicotecnico: false,
        teorico: false,
        pratico: false,
      });
      mockPrisma.studentSimuladoHistory.findFirst.mockResolvedValue(null);
      mockPrisma.lesson.findMany.mockResolvedValue([]);

      const report = await service.getComplianceReport('s1');

      expect(report.allCompleted).toBe(false);
      expect(report.completedSteps).toBe(0);
      expect(report.steps.teorico.completed).toBe(false);
      expect(report.steps.pratico.completed).toBe(false);
    });

    it('marks teorico as completed when simulado was passed', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 's1',
        name: 'Ana',
        ladvUploaded: true,
      });
      mockPrisma.studentChecklist.upsert.mockResolvedValue({
        studentId: 's1',
        medico: false,
        psicotecnico: false,
        teorico: false,
        pratico: false,
      });
      mockPrisma.studentSimuladoHistory.findFirst.mockResolvedValue({
        score: 24,
        passed: true,
        submittedAt: new Date('2026-04-01'),
      });
      mockPrisma.lesson.findMany.mockResolvedValue([]);
      mockPrisma.studentChecklist.update.mockResolvedValue({});

      const report = await service.getComplianceReport('s1');

      expect(report.steps.teorico.completed).toBe(true);
      expect(report.steps.teorico.score).toBe(24);
      expect(report.steps.pratico.completed).toBe(false);
      expect(report.completedSteps).toBe(1);
    });

    it('marks pratico as completed when total minutes >= 120 (CONTRAN 1.020/2025)', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 's1',
        name: 'Ana',
        ladvUploaded: true,
      });
      mockPrisma.studentChecklist.upsert.mockResolvedValue({
        studentId: 's1',
        medico: false,
        psicotecnico: false,
        teorico: false,
        pratico: false,
      });
      mockPrisma.studentSimuladoHistory.findFirst.mockResolvedValue(null);
      // 2 lessons × 60 min = 120 min
      mockPrisma.lesson.findMany.mockResolvedValue([
        makeLesson('l1'),
        makeLesson('l2'),
      ]);
      mockPrisma.studentChecklist.update.mockResolvedValue({});

      const report = await service.getComplianceReport('s1');

      expect(report.steps.pratico.completed).toBe(true);
      expect(report.steps.pratico.totalMinutes).toBe(120);
      expect(report.steps.pratico.requiredMinutes).toBe(120);
    });

    it('does not mark pratico with less than 120 minutes', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 's1',
        name: 'Ana',
        ladvUploaded: true,
      });
      mockPrisma.studentChecklist.upsert.mockResolvedValue({
        studentId: 's1',
        medico: false,
        psicotecnico: false,
        teorico: false,
        pratico: false,
      });
      mockPrisma.studentSimuladoHistory.findFirst.mockResolvedValue(null);
      // 1 lesson × 60 min = 60 min (below threshold)
      mockPrisma.lesson.findMany.mockResolvedValue([makeLesson('l1')]);

      const report = await service.getComplianceReport('s1');

      expect(report.steps.pratico.completed).toBe(false);
      expect(report.steps.pratico.totalMinutes).toBe(60);
    });

    it('reports allCompleted true when all 4 steps are done', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 's1',
        name: 'Ana',
        ladvUploaded: true,
      });
      mockPrisma.studentChecklist.upsert.mockResolvedValue({
        studentId: 's1',
        medico: true,
        psicotecnico: true,
        teorico: false,
        pratico: false,
      });
      mockPrisma.studentSimuladoHistory.findFirst.mockResolvedValue({
        score: 21,
        passed: true,
        submittedAt: new Date(),
      });
      // 2 lessons × 60 min = 120 min (minimum required)
      mockPrisma.lesson.findMany.mockResolvedValue([
        makeLesson('l1'),
        makeLesson('l2'),
      ]);
      mockPrisma.studentChecklist.update.mockResolvedValue({});

      const report = await service.getComplianceReport('s1');

      expect(report.allCompleted).toBe(true);
      expect(report.completedSteps).toBe(4);
    });

    it('auto-syncs DB when derived steps diverge from stored values', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 's1',
        name: 'Ana',
        ladvUploaded: true,
      });
      mockPrisma.studentChecklist.upsert.mockResolvedValue({
        studentId: 's1',
        medico: false,
        psicotecnico: false,
        teorico: false, // stale — simulado was passed
        pratico: false,
      });
      mockPrisma.studentSimuladoHistory.findFirst.mockResolvedValue({
        score: 25,
        passed: true,
        submittedAt: new Date(),
      });
      mockPrisma.lesson.findMany.mockResolvedValue([]);
      mockPrisma.studentChecklist.update.mockResolvedValue({});

      await service.getComplianceReport('s1');

      expect(mockPrisma.studentChecklist.update).toHaveBeenCalledWith({
        where: { studentId: 's1' },
        data: { teorico: true, pratico: false },
      });
    });
  });

  describe('getPracticalSummary', () => {
    it('returns canDeclareReadyForExam=true when 2 valid lessons + LADV PASS', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        readyForPracticalExamAt: null,
        ladvOcrStatus: 'PASS',
        ladvValidUntil: new Date(Date.now() + 86400000),
      });
      mockPrisma.lesson.findMany.mockResolvedValue([
        {
          durationMinutes: 60,
          biometryStartStatus: 'SUCCESS',
          biometryMidStatus: 'SUCCESS',
          biometryEndStatus: 'SUCCESS',
          integrityHash: 'h1',
          disputeOpened: false,
        },
        {
          durationMinutes: 65,
          biometryStartStatus: 'SUCCESS',
          biometryMidStatus: 'SUCCESS',
          biometryEndStatus: 'SUCCESS',
          integrityHash: 'h2',
          disputeOpened: false,
        },
      ]);
      const r = await service.getPracticalSummary('stu-1');
      expect(r.meetsMinimumLegal).toBe(true);
      expect(r.canDeclareReadyForExam).toBe(true);
      expect(r.totalValidatedMinutes).toBe(125);
    });

    it('does NOT count lessons with biometry failure', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        readyForPracticalExamAt: null,
        ladvOcrStatus: 'PASS',
        ladvValidUntil: new Date(Date.now() + 86400000),
      });
      mockPrisma.lesson.findMany.mockResolvedValue([
        {
          durationMinutes: 60,
          biometryStartStatus: 'FAILED',
          biometryMidStatus: 'SUCCESS',
          biometryEndStatus: 'SUCCESS',
          integrityHash: 'h1',
          disputeOpened: false,
        },
      ]);
      const r = await service.getPracticalSummary('stu-1');
      expect(r.totalValidatedMinutes).toBe(0);
      expect(r.lessonsWithIntegrityIssues).toBe(1);
      expect(r.meetsMinimumLegal).toBe(false);
    });

    it('canDeclareReadyForExam=false when LADV is expired even if minutes met', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        readyForPracticalExamAt: null,
        ladvOcrStatus: 'PASS',
        ladvValidUntil: new Date('2020-01-01'),
      });
      mockPrisma.lesson.findMany.mockResolvedValue([
        {
          durationMinutes: 120,
          biometryStartStatus: 'SUCCESS',
          biometryMidStatus: 'SUCCESS',
          biometryEndStatus: 'SUCCESS',
          integrityHash: 'h',
          disputeOpened: false,
        },
      ]);
      const r = await service.getPracticalSummary('stu-1');
      expect(r.meetsMinimumLegal).toBe(true);
      expect(r.canDeclareReadyForExam).toBe(false);
    });
  });

  describe('updateManualStep', () => {
    it('throws NotFoundException when student does not exist', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);
      await expect(
        service.updateManualStep('unknown', { step: 'medico', completed: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('upserts the checklist for medico step', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1' });
      mockPrisma.studentChecklist.upsert.mockResolvedValue({
        studentId: 's1',
        medico: true,
        psicotecnico: false,
        teorico: false,
        pratico: false,
      });

      const result = await service.updateManualStep('s1', {
        step: 'medico',
        completed: true,
      });

      expect(mockPrisma.studentChecklist.upsert).toHaveBeenCalledWith({
        where: { studentId: 's1' },
        create: { studentId: 's1', medico: true },
        update: { medico: true },
      });
      expect(result.medico).toBe(true);
    });

    it('upserts the checklist for psicotecnico step', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1' });
      mockPrisma.studentChecklist.upsert.mockResolvedValue({
        studentId: 's1',
        medico: false,
        psicotecnico: true,
        teorico: false,
        pratico: false,
      });

      await service.updateManualStep('s1', {
        step: 'psicotecnico',
        completed: true,
      });

      expect(mockPrisma.studentChecklist.upsert).toHaveBeenCalledWith({
        where: { studentId: 's1' },
        create: { studentId: 's1', psicotecnico: true },
        update: { psicotecnico: true },
      });
    });
  });
});
