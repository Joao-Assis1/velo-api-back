import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ValidateCpfDto {
  @ApiProperty({ example: '123.456.789-09' })
  @IsString()
  @Length(11, 14)
  cpf!: string;
}
