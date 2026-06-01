import { JourneyStage } from '../types/journey-stage.enum';

export interface JourneyStageMetadata {
  key: JourneyStage;
  label: string;
  description: string;
  helpRoute: string;
}

export const JOURNEY_STAGE_METADATA: Record<
  JourneyStage,
  JourneyStageMetadata
> = {
  [JourneyStage.REGISTERED]: {
    key: JourneyStage.REGISTERED,
    label: 'Cadastro concluído',
    description: 'Seus dados pessoais foram registrados.',
    helpRoute: '/app/student/profile',
  },
  [JourneyStage.THEORY_COURSE_IN_PROGRESS]: {
    key: JourneyStage.THEORY_COURSE_IN_PROGRESS,
    label: 'Curso teórico em andamento',
    description:
      'Realize o curso teórico no app CNH do Brasil ou em CFC credenciado.',
    helpRoute: '/app/student/theory-course',
  },
  [JourneyStage.RENACH_PENDING]: {
    key: JourneyStage.RENACH_PENDING,
    label: 'Abrir processo no DETRAN',
    description:
      'Abra seu processo no DETRAN e faça a coleta biométrica. O DETRAN vai agendar os exames médico e psicológico.',
    helpRoute: '/app/student/renach',
  },
  [JourneyStage.AWAITING_LADV_UPLOAD]: {
    key: JourneyStage.AWAITING_LADV_UPLOAD,
    label: 'Emissão da LADV',
    description:
      'Após aprovação nos exames e na prova teórica, solicite sua LADV pelo app CNH do Brasil e faça o upload aqui.',
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
    description:
      'Continue agendando aulas até se sentir pronto para o exame prático.',
    helpRoute: '/app/student/schedule',
  },
  [JourneyStage.READY_FOR_PRACTICAL_EXAM]: {
    key: JourneyStage.READY_FOR_PRACTICAL_EXAM,
    label: 'Pronto para o exame prático',
    description:
      'Procure o DETRAN/CFC do seu estado para agendar seu exame prático.',
    helpRoute: '/app/student/progress',
  },
};

export const MIN_PRACTICAL_MINUTES_FOR_READY = 120;
