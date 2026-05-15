import { ApiProperty } from '@nestjs/swagger';

export class PracticalSummaryDto {
  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  totalCompletedLessons!: number;

  @ApiProperty()
  totalValidatedMinutes!: number;

  @ApiProperty()
  requiredMinutes!: number;

  @ApiProperty()
  meetsMinimumLegal!: boolean;

  @ApiProperty()
  lessonsWithIntegrityIssues!: number;

  @ApiProperty()
  canDeclareReadyForExam!: boolean;
}
