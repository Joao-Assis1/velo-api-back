import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ValidatePlateDto {
  @ApiProperty({ example: 'ABC1D23' })
  @IsString()
  @Matches(/^[A-Z]{3}-?\d[A-Z\d]\d{2}$/i, {
    message: 'A placa deve estar no formato Mercosul ou no padrão antigo brasileiro',
  })
  plate!: string;
}
