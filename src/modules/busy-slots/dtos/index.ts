import { IsString, IsUUID, Matches, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBusySlotDto {
  @IsUUID('4')
  instructorId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}T/)
  date: string; // ISO 8601: 2026-04-20T00:00:00Z

  @Matches(/^\d{2}:\d{2}$/)
  startTime: string; // Formato: "14:00"

  @Matches(/^\d{2}:\d{2}$/)
  endTime: string; // Formato: "16:00"

  @IsString()
  @IsNotEmpty()
  reason: string; // "Manutenção de veículo", "Compromisso pessoal"
}

export class UpdateBusySlotDto {
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
