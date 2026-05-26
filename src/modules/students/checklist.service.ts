import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChecklistService {
  constructor(private prisma: PrismaService) {}

  async getChecklist(studentId: string) {
    let checklist = await this.prisma.studentChecklist.findUnique({
      where: { studentId },
    });

    if (!checklist) {
      checklist = await this.prisma.studentChecklist.create({
        data: { studentId },
      });
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { ladvNumber: true, ladvOcrStatus: true, ladvValidUntil: true },
    });

    return {
      ...checklist,
      ladv:
        !!student?.ladvNumber &&
        student?.ladvOcrStatus === 'PASS' &&
        !!student?.ladvValidUntil &&
        student.ladvValidUntil > new Date(),
    };
  }

  async updateStep(studentId: string, step: string, completed: boolean) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, ladvNumber: true, ladvOcrStatus: true, ladvValidUntil: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // C-011: Lógica de Precedência — LADV válida = número + status PASS + validade futura
    const ladvValid =
      !!student.ladvNumber &&
      student.ladvOcrStatus === 'PASS' &&
      !!student.ladvValidUntil &&
      student.ladvValidUntil > new Date();

    if (step === 'pratico' && completed && !ladvValid) {
      throw new BadRequestException(
        'Cannot complete practical step without a validated LADV',
      );
    }

    const validSteps = ['medico', 'psicotecnico', 'teorico', 'pratico'];
    if (!validSteps.includes(step)) {
      throw new BadRequestException(`Invalid step: ${step}`);
    }

    return this.prisma.studentChecklist.upsert({
      where: { studentId },
      create: {
        studentId,
        [step]: completed,
      },
      update: {
        [step]: completed,
      },
    });
  }
}
