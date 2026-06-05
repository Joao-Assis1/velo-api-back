import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  motherName?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/, {
    message: 'A UF de domicílio deve ser a sigla do estado com 2 letras maiúsculas (ex.: MS)',
  })
  ufDomicile?: string;

  @IsString()
  @IsOptional()
  intendedCategory?: string;

  @IsDateString()
  @IsOptional()
  termsAcceptedAt?: string;
}
