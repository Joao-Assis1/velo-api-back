import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  ASAAS_API_KEY?: string;

  @IsOptional()
  @IsString()
  ASAAS_BASE_URL?: string;

  @IsOptional()
  @IsString()
  ASAAS_WEBHOOK_TOKEN?: string;

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

  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;
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
