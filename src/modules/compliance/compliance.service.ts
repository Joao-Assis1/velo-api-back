import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateComplianceStepDto } from './dto/update-compliance-step.dto';

// CONTRAN 1.020/2025 — mínimo de 2 horas (120 min) de aulas práticas concluídas
const MINIMUM_PRACTICAL_MINUTES = 120;

@Injectable()
export class ComplianceService {
  constructor(private prisma: PrismaService) {}

  async getComplianceReport(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, ladvUploaded: true },
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

    // Auto-sync derived steps so the DB stays consistent
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
      medico: {
        completed: checklist.medico,
        derivedFrom: 'manual' as const,
      },
      psicotecnico: {
        completed: checklist.psicotecnico,
        derivedFrom: 'manual' as const,
      },
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
      ladvValid: student.ladvUploaded,
      steps,
      completedSteps: completedCount,
      totalSteps: 4,
      allCompleted: completedCount === 4,
    };
  }

  async updateManualStep(studentId: string, dto: UpdateComplianceStepDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });

    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.studentChecklist.upsert({
      where: { studentId },
      create: { studentId, [dto.step]: dto.completed },
      update: { [dto.step]: dto.completed },
    });
  }
}
