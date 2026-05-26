import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChargeDto {
  @ApiProperty()
  @IsString()
  lessonId!: string;

  @ApiProperty()
  @IsString()
  paymentMethodId!: string;
}
