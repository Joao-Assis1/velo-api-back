import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, Matches } from 'class-validator';

export class CompleteRenachDto {
  @ApiProperty({ example: 'MS123456789' })
  @IsString()
  @Matches(/^[A-Z]{2}\d{9}$/, {
    message: 'renachNumber must match UF + 9 digits (e.g. MS123456789)',
  })
  renachNumber!: string;

  @ApiProperty({ example: '2026-05-14T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  biometryDoneAt!: Date;
}
