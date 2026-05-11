import { plainToInstance } from 'class-transformer';
import {
  IsNumberString,
  IsOptional,
  IsString,
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
