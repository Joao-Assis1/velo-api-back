import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PracticalSummaryDto } from './dto/practical-summary.dto';

const MINIMUM_PRACTICAL_MINUTES = 120;

@Injectable()
export class ComplianceService {
  constructor(private prisma: PrismaService) {}

  async getComplianceReport(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        ladvNumber: true,
        ladvOcrStatus: true,
        ladvValidUntil: true,
      },
    });

    if (!student) throw new NotFoundException('Student not found');

    const [checklist, bestSimulado, completedLessons] = await Promise.all([
      this.prisma.studentChecklist.upsert({
        where: { studentId },
        create: { studentId },
        update: {},
      }),
      this.prisma.studentSimuladoHistory.findFirst({
        where: { studentId, passed: true },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.lesson.findMany({
        where: {
          studentId,
          status: 'completed',
          biometryStartStatus: 'SUCCESS',
          biometryMidStatus: 'SUCCESS',
          biometryEndStatus: 'SUCCESS',
        },
        select: { id: true, date: true, durationMinutes: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const totalPracticalMinutes = completedLessons.reduce(
      (sum, l) => sum + (l.durationMinutes ?? 0),
      0,
    );

    const teoricoCompleted = !!bestSimulado;
    const praticoCompleted = totalPracticalMinutes >= MINIMUM_PRACTICAL_MINUTES;

    if (
      checklist.teorico !== teoricoCompleted ||
      checklist.pratico !== praticoCompleted
    ) {
      await this.prisma.studentChecklist.update({
        where: { studentId },
        data: {
          teorico: teoricoCompleted,
          pratico: praticoCompleted,
        },
      });
    }

    const steps = {
      teorico: {
        completed: teoricoCompleted,
        derivedFrom: 'simulado' as const,
        score: bestSimulado?.score ?? null,
        passedAt: bestSimulado?.submittedAt ?? null,
      },
      pratico: {
        completed: praticoCompleted,
        derivedFrom: 'lessons' as const,
        totalMinutes: totalPracticalMinutes,
        requiredMinutes: MINIMUM_PRACTICAL_MINUTES,
        completedLessons: completedLessons.length,
        firstLessonAt: completedLessons[0]?.date ?? null,
        lastLessonAt: completedLessons.at(-1)?.date ?? null,
      },
    };

    const completedCount = Object.values(steps).filter((s) => s.completed).length;

    return {
      studentId,
      studentName: student.name,
      ladvValid:
        !!student.ladvNumber &&
        student.ladvOcrStatus === 'PASS' &&
        !!student.ladvValidUntil &&
        student.ladvValidUntil > new Date(),
      steps,
      completedSteps: completedCount,
      totalSteps: 2,
      allCompleted: completedCount === 2,
    };
  }

  async getPracticalSummary(studentId: string): Promise<PracticalSummaryDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        readyForPracticalExamAt: true,
        ladvOcrStatus: true,
        ladvValidUntil: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const lessons = await this.prisma.lesson.findMany({
      where: { studentId, status: 'completed' },
      select: {
        id: true,
        durationMinutes: true,
        biometryStartStatus: true,
        biometryMidStatus: true,
        biometryEndStatus: true,
        integrityHash: true,
        disputeOpened: true,
      },
    });

    const valid = lessons.filter(
      (l) =>
        (l.durationMinutes ?? 0) >= 50 &&
        l.biometryStartStatus === 'SUCCESS' &&
        l.biometryMidStatus === 'SUCCESS' &&
        l.biometryEndStatus === 'SUCCESS' &&
        l.integrityHash !== null &&
        l.disputeOpened === false,
    );

    const totalValidatedMinutes = valid.reduce(
      (sum, l) => sum + (l.durationMinutes ?? 0),
      0,
    );
    const meetsMinimumLegal = totalValidatedMinutes >= MINIMUM_PRACTICAL_MINUTES;
    const ladvValid =
      student.ladvOcrStatus === 'PASS' &&
      !!student.ladvValidUntil &&
      student.ladvValidUntil > new Date();

    return {
      studentId,
      totalCompletedLessons: valid.length,
      totalValidatedMinutes,
      requiredMinutes: MINIMUM_PRACTICAL_MINUTES,
      meetsMinimumLegal,
      lessonsWithIntegrityIssues: lessons.length - valid.length,
      canDeclareReadyForExam: meetsMinimumLegal && ladvValid,
    };
  }
}
