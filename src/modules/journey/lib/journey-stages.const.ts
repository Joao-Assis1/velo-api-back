import { JourneyStage } from '../types/journey-stage.enum';

export interface JourneyStageMetadata {
  key: JourneyStage;
  label: string;
  description: string;
  helpRoute: string;
}

export const JOURNEY_STAGE_METADATA: Record<JourneyStage, JourneyStageMetadata> = {
  [JourneyStage.REGISTERED]: {
    key: JourneyStage.REGISTERED,
    label: 'Cadastro concluído',
    description: 'Seus dados pessoais foram registrados.',
    helpRoute: '/app/student/profile',
  },
  [JourneyStage.THEORY_COURSE_IN_PROGRESS]: {
    key: JourneyStage.THEORY_COURSE_IN_PROGRESS,
    label: 'Curso teórico em andamento',
    description: 'Realize o curso teórico no app CNH do Brasil ou em CFC credenciado.',
    helpRoute: '/app/student/theory-course',
  },
  [JourneyStage.RENACH_PENDING]: {
    key: JourneyStage.RENACH_PENDING,
    label: 'Abrir processo no DETRAN',
    description: 'Abra seu processo no DETRAN da sua UF e faça a coleta biométrica.',
    helpRoute: '/app/student/renach',
  },
  [JourneyStage.MEDICAL_PENDING]: {
    key: JourneyStage.MEDICAL_PENDING,
    label: 'Exame médico',
    description: 'Realize o exame de aptidão física e mental em clínica credenciada.',
    helpRoute: '/app/student/exams/medical',
  },
  [JourneyStage.PSYCH_PENDING]: {
    key: JourneyStage.PSYCH_PENDING,
    label: 'Avaliação psicológica',
    description: 'Realize a avaliação psicológica em clínica credenciada.',
    helpRoute: '/app/student/exams/psychological',
  },
  [JourneyStage.THEORY_EXAM_PENDING]: {
    key: JourneyStage.THEORY_EXAM_PENDING,
    label: 'Exame teórico oficial',
    description: 'Faça o exame teórico oficial no DETRAN e registre o resultado.',
    helpRoute: '/app/student/exams/theory-official',
  },
  [JourneyStage.AWAITING_LADV_UPLOAD]: {
    key: JourneyStage.AWAITING_LADV_UPLOAD,
    label: 'Emissão da LADV',
    description: 'Solicite sua LADV pelo app CNH do Brasil e faça o upload aqui.',
    helpRoute: '/app/student/ladv',
  },
  [JourneyStage.LADV_UPLOADED_VALID]: {
    key: JourneyStage.LADV_UPLOADED_VALID,
    label: 'LADV válida',
    description: 'Você está liberado para agendar suas aulas práticas.',
    helpRoute: '/app/student/schedule',
  },
  [JourneyStage.PRACTICAL_IN_PROGRESS]: {
    key: JourneyStage.PRACTICAL_IN_PROGRESS,
    label: 'Aulas práticas em andamento',
    description: 'Continue agendando aulas até se sentir pronto para o exame prático.',
    helpRoute: '/app/student/schedule',
  },
  [JourneyStage.READY_FOR_PRACTICAL_EXAM]: {
    key: JourneyStage.READY_FOR_PRACTICAL_EXAM,
    label: 'Pronto para o exame prático',
    description: 'Procure o DETRAN/CFC do seu estado para agendar seu exame prático.',
    helpRoute: '/app/student/progress',
  },
};

export const MIN_PRACTICAL_MINUTES_FOR_READY = 120;
