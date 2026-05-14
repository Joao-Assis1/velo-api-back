import { ApiProperty } from '@nestjs/swagger';
import { JourneyStage } from '../types/journey-stage.enum';

export class TimelineStepDto {
  @ApiProperty({ enum: JourneyStage })
  key!: JourneyStage;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  helpRoute!: string;

  @ApiProperty({ enum: ['completed', 'in_progress', 'locked'] })
  status!: 'completed' | 'in_progress' | 'locked';
}
