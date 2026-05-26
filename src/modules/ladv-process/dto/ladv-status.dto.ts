import { ApiProperty } from '@nestjs/swagger';

export class LadvStatusDto {
  @ApiProperty({ required: false, nullable: true })
  ladvNumber!: string | null;

  @ApiProperty({ required: false, nullable: true })
  ladvIssuedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  ladvValidUntil!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  ladvOcrConfidence!: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    enum: ['PASS', 'NEEDS_REVIEW', 'FAIL'],
  })
  ladvOcrStatus!: 'PASS' | 'NEEDS_REVIEW' | 'FAIL' | null;

  @ApiProperty({ required: false, nullable: true })
  ladvDocumentUrl!: string | null;

  @ApiProperty({ description: 'Stage from JourneyService after this state' })
  stage!: string;

  @ApiProperty({
    description: 'True when ladvOcrStatus=PASS AND ladvValidUntil > now',
  })
  canBook!: boolean;
}
