import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';

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

  @IsString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  educationLevel?: string;

  @IsString()
  @IsOptional()
  renachNumber?: string;

  @IsString()
  @IsOptional()
  instructorType?: string;

  @IsDateString()
  @IsOptional()
  termsAcceptedAt?: string;

  @IsString()
  @IsOptional()
  detranCredentialNumber?: string;

  @IsString()
  @IsOptional()
  detranCredentialUf?: string;
}
