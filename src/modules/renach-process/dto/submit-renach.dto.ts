import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, Length, Matches } from 'class-validator';

export class SubmitRenachDto {
  @ApiProperty({ example: 'MS000000001' })
  @IsString()
  @Matches(/^[A-Z]{2}\d{9}$/, {
    message:
      'renachNumber deve ter 2 letras da UF + 9 dígitos (ex: MS000000001)',
  })
  renachNumber!: string;

  @ApiProperty({ example: 'MS' })
  @IsString()
  @Length(2, 2)
  ufDetran!: string;

  @ApiProperty({ example: '2026-05-28T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  biometryDoneAt!: Date;
}
