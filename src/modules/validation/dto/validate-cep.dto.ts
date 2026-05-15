import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ValidateCepDto {
  @ApiProperty({ example: '01310-100' })
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/)
  cep!: string;
}
