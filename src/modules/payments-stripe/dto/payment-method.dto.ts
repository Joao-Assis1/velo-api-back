import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AttachPaymentMethodDto {
  @ApiProperty({ example: 'pm_1QabcXYZ123' })
  @IsString()
  stripePaymentMethodId!: string;
}

export class PaymentMethodResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  stripePaymentMethodId!: string;
  @ApiProperty()
  brand!: string;
  @ApiProperty()
  last4!: string;
  @ApiProperty()
  cardholderName!: string;
  @ApiProperty()
  expiryMonth!: string;
  @ApiProperty()
  expiryYear!: string;
  @ApiProperty()
  isDefault!: boolean;
}
