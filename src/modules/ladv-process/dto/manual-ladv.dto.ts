import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, Matches } from 'class-validator';

export class ManualLadvDto {
  @ApiProperty({ example: 'LADV-MS-12345678' })
  @IsString()
  @Matches(/^LADV-[A-Z]{2}-\d{4,12}$/, {
    message: 'ladvNumber must match LADV-UF-NNNNN format',
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
