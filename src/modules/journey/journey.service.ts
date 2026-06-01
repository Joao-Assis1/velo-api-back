import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeStageFromData,
  JourneyStateResult,
  JourneyDataSnapshot,
} from './lib/compute-stage';
import { JourneyStage, JOURNEY_STAGE_ORDER } from './types/journey-stage.enum';
import {
  JOURNEY_STAGE_METADATA,
  MIN_PRACTICAL_MINUTES_FOR_READY,
} from './lib/journey-stages.const';

@Injectable()
export class JourneyService {
  private readonly logger = new Logger(JourneyService.name);

  constructor(private prisma: PrismaService) {}

  private async loadSnapshot(studentId: string): Promise<JourneyDataSnapshot> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        theoryCourseStartedAt: true,
        ladvNumber: true,
        ladvValidUntil: true,
        ladvOcrStatus: true,
        readyForPracticalExamAt: true,
      },
    });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);

    const [renach, lessons] = await Promise.all([
      this.prisma.renachProcess.findUnique({
        where: { studentId },
        select: { status: true, renachNumber: true },
      }),
      this.prisma.lesson.findMany({
        where: { studentId, status: 'completed' },
        select: {
          status: true,
          durationMinutes: true,
          biometryStartStatus: true,
          biometryMidStatus: true,
          biometryEndStatus: true,
          integrityHash: true,
          disputeOpened: true,
        },
      }),
    ]);

    const validLessons = lessons.filter(
      (l) =>
        l.status === 'completed' &&
        (l.durationMinutes ?? 0) >= 50 &&
        l.biometryStartStatus === 'SUCCESS' &&
        l.biometryMidStatus === 'SUCCESS' &&
        l.biometryEndStatus === 'SUCCESS' &&
        l.integrityHash !== null &&
        l.disputeOpened === false,
    );
    const totalValidatedMinutes = validLessons.reduce(
      (sum, l) => sum + (l.durationMinutes ?? 0),
      0,
    );

    return {
      student,
      renach,
      practicalSummary: {
        totalCompletedLessons: validLessons.length,
        totalValidatedMinutes,
        meetsMinimumLegal:
          totalValidatedMinutes >= MIN_PRACTICAL_MINUTES_FOR_READY,
      },
    };
  }

  async computeStage(studentId: string): Promise<JourneyStateResult> {
    const data = await this.loadSnapshot(studentId);
    return computeStageFromData(data);
  }

  async getTimeline(studentId: string) {
    const state = await this.computeStage(studentId);
    return JOURNEY_STAGE_ORDER.map((s) => {
      const meta = JOURNEY_STAGE_METADATA[s];
      let status: 'completed' | 'in_progress' | 'locked';
      if (state.completedSteps.includes(s)) status = 'completed';
      else if (s === state.stage) status = 'in_progress';
      else status = 'locked';
      return { ...meta, status };
    });
  }

  async assertCanScheduleLesson(studentId: string): Promise<void> {
    const state = await this.computeStage(studentId);
    const minIdx = JOURNEY_STAGE_ORDER.indexOf(
      JourneyStage.LADV_UPLOADED_VALID,
    );
    const curIdx = JOURNEY_STAGE_ORDER.indexOf(state.stage);
    if (curIdx < minIdx) {
      throw new BadRequestException(
        `Cannot schedule lesson — current stage is ${state.stage}, needs LADV_UPLOADED_VALID or above`,
      );
    }
  }

  async declareReadyForExam(studentId: string): Promise<JourneyStateResult> {
    const data = await this.loadSnapshot(studentId);
    if (!data.practicalSummary.meetsMinimumLegal) {
      throw new BadRequestException(
        `Minimum ${MIN_PRACTICAL_MINUTES_FOR_READY} validated minutes not met (current: ${data.practicalSummary.totalValidatedMinutes})`,
      );
    }
    data.student.readyForPracticalExamAt = new Date();
    const newState = computeStageFromData(data);
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        readyForPracticalExamAt: data.student.readyForPracticalExamAt,
        journeyStage: newState.stage,
      },
    });
    return newState;
  }

  async refresh(studentId: string): Promise<JourneyStateResult> {
    const state = await this.computeStage(studentId);
    await this.prisma.student.update({
      where: { id: studentId },
      data: { journeyStage: state.stage },
    });
    return state;
  }

  async initForStudent(studentId: string): Promise<void> {
    await this.refresh(studentId);
    this.logger.log(`Journey initialized for student ${studentId}`);
  }
}
