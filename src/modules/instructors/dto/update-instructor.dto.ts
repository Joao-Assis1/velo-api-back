import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  isEmail,
  isUUID,
} from 'class-validator';

const PIX_PATTERNS: Record<string, RegExp> = {
  CPF: /^\d{11}$/,
  CNPJ: /^\d{14}$/,
  PHONE: /^\+\d{10,15}$/,
};

function IsValidPixKey(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidPixKey',
      target: (
        object as { constructor: abstract new (...args: unknown[]) => object }
      ).constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const dto = args.object as { pixKeyType?: string };
          const type: string | undefined = dto.pixKeyType;
          if (!type) return true; // sem tipo → sem validação de formato
          if (typeof value !== 'string' || value.length === 0) return false;
          if (type === 'EMAIL') return isEmail(value);
          if (type === 'EVP') return isUUID(value, '4');
          const pattern = PIX_PATTERNS[type];
          return pattern ? pattern.test(value) : false;
        },
        defaultMessage(args: ValidationArguments) {
          const dto = args.object as { pixKeyType?: string };
          const type: string | undefined = dto.pixKeyType;
          const msgs: Record<string, string> = {
            CPF: 'pixKey CPF deve ter 11 dígitos numéricos',
            CNPJ: 'pixKey CNPJ deve ter 14 dígitos numéricos',
            EMAIL: 'pixKey EMAIL deve ser um e-mail válido',
            PHONE: 'pixKey PHONE deve estar no formato +5511999999999',
            EVP: 'pixKey EVP deve ser um UUID v4 válido',
          };
          return type ? (msgs[type] ?? 'pixKey inválida') : 'pixKey inválida';
        },
      },
    });
  };
}

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

  @IsBoolean()
  @IsOptional()
  hasDoubleCommand?: boolean;

  @IsBoolean()
  @IsOptional()
  noGravissima?: boolean;

  @IsBoolean()
  @IsOptional()
  hasInstructorCourse?: boolean;

  @IsBoolean()
  @IsOptional()
  noCassacao?: boolean;

  @IsOptional()
  @IsIn(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'], {
    message: 'pixKeyType deve ser CPF, CNPJ, EMAIL, PHONE ou EVP',
  })
  pixKeyType?: string;

  // Property initializer (= undefined) ensures pixKey is an own property on every
  // instance so that @ValidateIf + @IsNotEmpty fire even when pixKey is absent
  // from the plain input object.
  //
  // IMPORTANT: Only ONE @ValidateIf condition is used for the whole property.
  // Using multiple @ValidateIf decorators ANDs all conditions — if any is false
  // (e.g. o.pixKey != null) every validator is skipped. Format-specific checks
  // (IsString, IsValidPixKey) are embedded inside the condition logic instead.
  @ValidateIf((o: { pixKeyType?: string }) => o.pixKeyType != null)
  @IsNotEmpty({ message: 'pixKey é obrigatória quando pixKeyType é informado' })
  @IsString({ message: 'pixKey deve ser uma string' })
  @IsValidPixKey()
  pixKey: string | undefined = undefined;
}
