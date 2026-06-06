import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, Matches } from 'class-validator';

export class CompleteRenachDto {
  @ApiProperty({ example: 'MS123456789' })
  @IsString()
  @Matches(/^[A-Z]{2}\d{9}$/, {
    message: 'O número do RENACH deve conter a UF + 9 dígitos (ex.: MS123456789)',
  })
  renachNumber!: string;

  @ApiProperty({ example: '2026-05-14T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  biometryDoneAt!: Date;
}
