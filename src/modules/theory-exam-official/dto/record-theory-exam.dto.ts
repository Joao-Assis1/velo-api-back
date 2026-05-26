import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsOptional, Max, Min } from 'class-validator';

export class RecordTheoryExamDto {
  @ApiProperty({ example: '2026-06-15T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  takenAt!: Date;

  @ApiPropertyOptional({ example: 26 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  score?: number;

  @ApiProperty({ example: true })
  @Type(() => Boolean)
  @IsBoolean()
  passed!: boolean;
}
