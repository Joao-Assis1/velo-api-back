import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString } from 'class-validator';

export class UploadMedicalLaudoDto {
  @ApiProperty({ enum: ['APTO', 'INAPTO', 'APTO_COM_RESTRICOES'] })
  @IsIn(['APTO', 'INAPTO', 'APTO_COM_RESTRICOES'])
  result!: 'APTO' | 'INAPTO' | 'APTO_COM_RESTRICOES';

  @ApiProperty({ example: '2027-06-01T00:00:00Z' })
  @Type(() => Date)
  @IsDate()
  validUntil!: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  restrictions?: string;
}
