import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, Matches } from 'class-validator';

export class ManualLadvDto {
  @ApiProperty({ example: '1234567' })
  @Matches(/^\d{7}$/, {
    message: 'ladvNumber must be exactly 7 digits',
  })
  ladvNumber!: string;

  @ApiProperty({ example: '2026-05-10T00:00:00Z' })
  @Type(() => Date)
  @IsDate()
  ladvIssuedAt!: Date;

  @ApiProperty({ example: '2026-11-10T00:00:00Z' })
  @Type(() => Date)
  @IsDate()
  ladvValidUntil!: Date;
}
