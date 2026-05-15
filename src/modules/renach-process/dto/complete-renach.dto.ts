import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, Matches } from 'class-validator';

export class CompleteRenachDto {
  @ApiProperty({ example: 'RNC-2026-00001' })
  @IsString()
  @Matches(/^RNC-\d{4}-\d{5}$/, {
    message: 'renachNumber must match RNC-YYYY-NNNNN',
  })
  renachNumber!: string;

  @ApiProperty({ example: '2026-05-14T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  biometryDoneAt!: Date;
}
