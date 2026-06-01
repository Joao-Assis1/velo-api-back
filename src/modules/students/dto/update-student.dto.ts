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
    message: 'ufDomicile must be a 2-letter uppercase state code (e.g. MS)',
  })
  ufDomicile?: string;

  @IsString()
  @IsOptional()
  intendedCategory?: string;

  @IsDateString()
  @IsOptional()
  termsAcceptedAt?: string;
}
