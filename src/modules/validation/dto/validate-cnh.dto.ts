import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ValidateCnhDto {
  @ApiProperty({ example: '02650306461' })
  @IsString()
  @Length(11, 14)
  cnhNumber!: string;

  @ApiProperty({ example: '12345678909' })
  @IsString()
  @Length(11, 14)
  cpf!: string;
}
