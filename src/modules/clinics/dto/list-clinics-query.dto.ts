import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListClinicsQueryDto {
  @ApiPropertyOptional({ enum: ['MEDICAL', 'PSYCHOLOGICAL'] })
  @IsOptional()
  @IsIn(['MEDICAL', 'PSYCHOLOGICAL'])
  type?: 'MEDICAL' | 'PSYCHOLOGICAL';

  @ApiPropertyOptional({ example: 'MS' })
  @IsOptional()
  @IsString()
  uf?: string;

  @ApiPropertyOptional({ example: 'Campo Grande' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
