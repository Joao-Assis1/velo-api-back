import {
  IsArray,
  IsNumber,
  IsString,
  IsISO8601,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TelemetryPointDto {
  @ApiProperty({ example: -23.5505 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: -46.6333 })
  @IsNumber()
  lng: number;

  @ApiProperty({ example: 40.5 })
  @IsNumber()
  velocity: number;

  @ApiProperty({ example: '2026-04-27T10:00:00Z' })
  @IsISO8601()
  timestamp: string;
}

export class CreateTelemetriaBatchDto {
  @ApiProperty({ example: 'lesson-uuid-here' })
  @IsString()
  lessonId: string;

  @ApiProperty({ type: [TelemetryPointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelemetryPointDto)
  points: TelemetryPointDto[];
}
