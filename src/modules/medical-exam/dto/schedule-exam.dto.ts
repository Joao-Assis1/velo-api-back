import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class ScheduleMedicalExamDto {
  @ApiProperty()
  @IsString()
  clinicId!: string;

  @ApiProperty({ example: '2026-06-01T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;
}
