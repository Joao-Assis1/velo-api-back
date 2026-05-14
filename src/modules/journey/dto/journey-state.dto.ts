import { ApiProperty } from '@nestjs/swagger';
import { JourneyStage } from '../types/journey-stage.enum';

export class JourneyStateDto {
  @ApiProperty({ enum: JourneyStage })
  stage!: JourneyStage;

  @ApiProperty({ type: [String], enum: JourneyStage })
  completedSteps!: JourneyStage[];

  @ApiProperty({ description: 'Code identifying the recommended next action' })
  nextStep!: string;

  @ApiProperty({ type: [String], description: 'Codes of active blockers' })
  blockers!: string[];

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  progressPct!: number;
}
