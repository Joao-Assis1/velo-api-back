import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString } from 'class-validator';

export class UpdateInstructorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  cpf?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsOptional()
  pricePerClass?: number;

  @IsString()
  @IsOptional()
  cnhNumber?: string;

  @IsString()
  @IsOptional()
  cnhCategory?: string;

  @IsString()
  @IsOptional()
  cnhExpiry?: string;

  @IsBoolean()
  @IsOptional()
  cnhEar?: boolean;

  @IsString()
  @IsOptional()
  certidaoNegativa?: string;

  @IsDateString()
  @IsOptional()
  termsAcceptedAt?: string;
}
