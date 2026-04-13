import { IsEmail, IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateStudentDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  cpf?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsBoolean()
  @IsOptional()
  ladvUploaded?: boolean;
}
