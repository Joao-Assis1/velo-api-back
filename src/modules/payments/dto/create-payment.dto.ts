import { IsNumber, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsOptional()
  lessonId?: string;
}
