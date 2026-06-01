import { JourneyStage, JOURNEY_STAGE_ORDER } from '../types/journey-stage.enum';

export interface JourneyDataSnapshot {
  student: {
    theoryCourseStartedAt: Date | null;
    ladvNumber: string | null;
    ladvValidUntil: Date | null;
    ladvOcrStatus: string | null;
    readyForPracticalExamAt: Date | null;
  };
  renach: { status: string; renachNumber: string | null } | null;
  practicalSummary: {
    totalCompletedLessons: number;
    totalValidatedMinutes: number;
    meetsMinimumLegal: boolean;
  };
}

export interface JourneyStateResult {
  stage: JourneyStage;
  completedSteps: JourneyStage[];
  nextStep: string;
  blockers: string[];
  progressPct: number;
}

const now = () => new Date();

function isLadvValid(student: JourneyDataSnapshot['student']): boolean {
  if (!student.ladvNumber) return false;
  if (student.ladvOcrStatus !== 'PASS') return false;
  if (!student.ladvValidUntil || student.ladvValidUntil <= now()) return false;
  return true;
}

export function computeStageFromData(
  data: JourneyDataSnapshot,
): JourneyStateResult {
  const blockers: string[] = [];
  let stage: JourneyStage = JourneyStage.REGISTERED;
  let nextStep = 'START_THEORY_COURSE';

  if (data.student.theoryCourseStartedAt) {
    stage = JourneyStage.THEORY_COURSE_IN_PROGRESS;
    nextStep = 'OPEN_RENACH';
  }

  const renachDone =
    data.renach?.status === 'DONE' && !!data.renach?.renachNumber;

  if (
    stage === JourneyStage.THEORY_COURSE_IN_PROGRESS &&
    data.renach &&
    !renachDone
  ) {
    stage = JourneyStage.RENACH_PENDING;
    nextStep = 'COMPLETE_RENACH';
  }

  if (renachDone) {
    stage = JourneyStage.AWAITING_LADV_UPLOAD;
    nextStep = 'UPLOAD_LADV';

    if (isLadvValid(data.student)) {
      stage = JourneyStage.LADV_UPLOADED_VALID;
      nextStep = 'SCHEDULE_FIRST_LESSON';

      if (data.practicalSummary.totalCompletedLessons > 0) {
        stage = JourneyStage.PRACTICAL_IN_PROGRESS;
        nextStep = data.practicalSummary.meetsMinimumLegal
          ? 'DECLARE_READY_FOR_EXAM'
          : 'SCHEDULE_MORE_LESSONS';

        if (
          data.practicalSummary.meetsMinimumLegal &&
          data.student.readyForPracticalExamAt
        ) {
          stage = JourneyStage.READY_FOR_PRACTICAL_EXAM;
          nextStep = 'GO_TO_DETRAN_FOR_PRACTICAL_EXAM';
        }
      }
    } else if (
      data.student.ladvNumber &&
      data.student.ladvValidUntil &&
      data.student.ladvValidUntil <= now()
    ) {
      blockers.push('LADV_EXPIRED');
    }
  }

  const completedSteps = JOURNEY_STAGE_ORDER.filter(
    (s) => JOURNEY_STAGE_ORDER.indexOf(s) < JOURNEY_STAGE_ORDER.indexOf(stage),
  );
  const progressPct = Math.round(
    (JOURNEY_STAGE_ORDER.indexOf(stage) / (JOURNEY_STAGE_ORDER.length - 1)) *
      100,
  );

  return { stage, completedSteps, nextStep, blockers, progressPct };
}
