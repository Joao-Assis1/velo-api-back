import {
  IsString,
  IsUUID,
  Matches,
  Length,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @IsUUID('4')
  studentId: string;

  @Matches(/^\d{13,19}$/, { message: 'Número de cartão inválido' })
  cardNumber: string;

  @IsString()
  @Length(2, 60)
  cardholderName: string;

  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'Mês de expiração inválido (01-12)' })
  expiryMonth: string;

  @Matches(/^\d{4}$/, { message: 'Ano de expiração inválido (YYYY)' })
  expiryYear: string;

  @Matches(/^\d{3,4}$/, { message: 'CVV inválido' })
  cvv: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class ProcessPaymentDto {
  @IsUUID('4')
  studentId: string;

  @IsUUID('4')
  lessonId: string;

  @IsUUID('4')
  paymentMethodId: string;

  @IsNotEmpty()
  amount: number;
}
