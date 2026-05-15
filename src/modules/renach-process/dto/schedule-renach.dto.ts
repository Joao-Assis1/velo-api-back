import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ScheduleRenachDto {
  @ApiProperty({ example: 'MS' })
  @IsString()
  @Length(2, 2)
  uf!: string;
}
