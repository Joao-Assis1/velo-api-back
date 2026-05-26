import { ApiProperty } from '@nestjs/swagger';

export class ConnectStatusDto {
  @ApiProperty({ required: false, nullable: true })
  stripeAccountId!: string | null;

  @ApiProperty({ enum: ['PENDING', 'ONBOARDING', 'ACTIVE', 'RESTRICTED'] })
  stripeAccountStatus!: string;

  @ApiProperty()
  stripePayoutsEnabled!: boolean;
}

export class ConnectOnboardResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  expiresAt!: number;
}
