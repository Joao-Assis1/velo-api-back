import { ApiProperty } from '@nestjs/swagger';

export class SetupIntentResponseDto {
  @ApiProperty()
  clientSecret!: string;

  @ApiProperty()
  customerId!: string;
}
