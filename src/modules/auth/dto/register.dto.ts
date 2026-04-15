import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  IsNumber,
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
}
