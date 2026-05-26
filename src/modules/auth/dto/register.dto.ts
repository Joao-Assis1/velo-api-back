import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  IsNumber,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
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

  @IsString()
  @IsOptional()
  instructorType?: string;

  @IsString()
  @IsOptional()
  vehicleModel?: string;

  @IsString()
  @IsOptional()
  credencial?: string;

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
  motherName?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/, { message: 'ufDomicile must be a 2-letter uppercase state code (e.g. SP)' })
  ufDomicile?: string;

  @IsString()
  @IsOptional()
  intendedCategory?: string;

  @IsString()
  @IsOptional()
  educationLevel?: string;

  @IsString()
  @IsOptional()
  renachNumber?: string;

  @IsString()
  @IsOptional()
  vehiclePlate?: string;

  @IsString()
  @IsOptional()
  vehicleYear?: string;

  @IsString()
  @IsOptional()
  transmission?: string;
}
