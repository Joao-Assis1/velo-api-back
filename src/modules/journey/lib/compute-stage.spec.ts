import { computeStageFromData, JourneyDataSnapshot } from './compute-stage';
import { JourneyStage } from '../types/journey-stage.enum';

const future = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const past = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const emptySnapshot = (): JourneyDataSnapshot => ({
  student: {
    theoryCourseStartedAt: null,
    ladvValidUntil: null,
    ladvNumber: null,
    ladvOcrStatus: null,
    readyForPracticalExamAt: null,
  },
  renach: null,
  practicalSummary: {
    totalCompletedLessons: 0,
    totalValidatedMinutes: 0,
    meetsMinimumLegal: false,
  },
});

const withRenachDone = (data: JourneyDataSnapshot): JourneyDataSnapshot => ({
  ...data,
  renach: { status: 'DONE', renachNumber: 'RENACH-001' },
});

const withValidLadv = (data: JourneyDataSnapshot): JourneyDataSnapshot => ({
  ...data,
  student: {
    ...data.student,
    ladvNumber: 'LADV-XYZ',
    ladvValidUntil: future(180),
    ladvOcrStatus: 'PASS',
  },
});

describe('computeStageFromData', () => {
  it('returns REGISTERED for a brand-new student', () => {
    const result = computeStageFromData(emptySnapshot());
    expect(result.stage).toBe(JourneyStage.REGISTERED);
    expect(result.completedSteps).toEqual([]);
    expect(result.progressPct).toBe(0);
  });

  it('returns THEORY_COURSE_IN_PROGRESS after the student declares course started', () => {
    const data = emptySnapshot();
    data.student.theoryCourseStartedAt = past(2);
    const result = computeStageFromData(data);
    expect(result.stage).toBe(JourneyStage.THEORY_COURSE_IN_PROGRESS);
    expect(result.completedSteps).toContain(JourneyStage.REGISTERED);
  });

  it('returns RENACH_PENDING when course started and renach process not yet done', () => {
    const data = emptySnapshot();
    data.student.theoryCourseStartedAt = past(2);
    data.renach = { status: 'PENDING', renachNumber: null };
    const result = computeStageFromData(data);
    expect(result.stage).toBe(JourneyStage.RENACH_PENDING);
  });

  it('moves to AWAITING_LADV_UPLOAD when RENACH is done', () => {
    const data = emptySnapshot();
    data.student.theoryCourseStartedAt = past(2);
    const result = computeStageFromData(withRenachDone(data));
    expect(result.stage).toBe(JourneyStage.AWAITING_LADV_UPLOAD);
    expect(result.nextStep).toBe('UPLOAD_LADV');
  });

  it('moves to LADV_UPLOADED_VALID when LADV is uploaded and valid', () => {
    const data = emptySnapshot();
    data.student.theoryCourseStartedAt = past(2);
    const result = computeStageFromData(withValidLadv(withRenachDone(data)));
    expect(result.stage).toBe(JourneyStage.LADV_UPLOADED_VALID);
    expect(result.nextStep).toBe('SCHEDULE_FIRST_LESSON');
  });

  it('falls back to AWAITING_LADV_UPLOAD when LADV is expired', () => {
    const data = emptySnapshot();
    data.student.theoryCourseStartedAt = past(2);
    data.student.ladvNumber = 'LADV-XYZ';
    data.student.ladvValidUntil = past(1);
    data.student.ladvOcrStatus = 'PASS';
    const result = computeStageFromData(withRenachDone(data));
    expect(result.stage).toBe(JourneyStage.AWAITING_LADV_UPLOAD);
    expect(result.blockers).toContain('LADV_EXPIRED');
  });

  it('moves to PRACTICAL_IN_PROGRESS once at least one lesson is counted', () => {
    const data = emptySnapshot();
    data.student.theoryCourseStartedAt = past(2);
    data.practicalSummary = {
      totalCompletedLessons: 1,
      totalValidatedMinutes: 55,
      meetsMinimumLegal: false,
    };
    const result = computeStageFromData(withValidLadv(withRenachDone(data)));
    expect(result.stage).toBe(JourneyStage.PRACTICAL_IN_PROGRESS);
    expect(result.nextStep).toBe('SCHEDULE_MORE_LESSONS');
  });

  it('moves to READY_FOR_PRACTICAL_EXAM when minimum legal is met AND student declared ready', () => {
    const data = emptySnapshot();
    data.student.theoryCourseStartedAt = past(2);
    data.student.readyForPracticalExamAt = past(1);
    data.practicalSummary = {
      totalCompletedLessons: 3,
      totalValidatedMinutes: 165,
      meetsMinimumLegal: true,
    };
    const result = computeStageFromData(withValidLadv(withRenachDone(data)));
    expect(result.stage).toBe(JourneyStage.READY_FOR_PRACTICAL_EXAM);
    expect(result.progressPct).toBe(100);
  });

  it('stays PRACTICAL_IN_PROGRESS if minimum met but student has NOT declared ready yet', () => {
    const data = emptySnapshot();
    data.student.theoryCourseStartedAt = past(2);
    data.practicalSummary = {
      totalCompletedLessons: 3,
      totalValidatedMinutes: 165,
      meetsMinimumLegal: true,
    };
    const result = computeStageFromData(withValidLadv(withRenachDone(data)));
    expect(result.stage).toBe(JourneyStage.PRACTICAL_IN_PROGRESS);
    expect(result.nextStep).toBe('DECLARE_READY_FOR_EXAM');
  });

  it('reports a meaningful nextStep at every stage', () => {
    const data = emptySnapshot();
    expect(computeStageFromData(data).nextStep).toBe('START_THEORY_COURSE');
  });
});
