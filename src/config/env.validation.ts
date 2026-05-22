import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsString()
  @MinLength(16)
  ADMIN_API_KEY!: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  PLATFORM_FEE_PERCENT?: string;

  @IsOptional()
  @IsIn(['mock', 'serpro'])
  DOCUMENT_VALIDATION_PROVIDER?: string = 'mock';

  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  VIA_CEP_BASE_URL?: string = 'https://viacep.com.br/ws';

  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  BRASIL_API_BASE_URL?: string = 'https://brasilapi.com.br/api';

  @IsString()
  STRIPE_SECRET_KEY!: string;

  @IsString()
  STRIPE_WEBHOOK_SECRET!: string;

  @IsOptional()
  @IsString()
  STRIPE_CONNECT_CLIENT_ID?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  STRIPE_CONNECT_REFRESH_URL?: string = 'http://localhost:3001/api/v1/payments-stripe/connect/refresh';

  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  STRIPE_CONNECT_RETURN_URL?: string = 'http://localhost:3001/api/v1/payments-stripe/connect/return';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: true,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
