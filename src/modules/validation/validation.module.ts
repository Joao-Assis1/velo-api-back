import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';
import { DOCUMENT_VALIDATION_PROVIDER } from './providers/document-validation.provider';
import { MockValidationProvider } from './providers/mock-validation.provider';
import { SerproValidationProvider } from './providers/serpro-validation.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [ValidationController],
  providers: [
    ValidationService,
    MockValidationProvider,
    SerproValidationProvider,
    {
      provide: DOCUMENT_VALIDATION_PROVIDER,
      inject: [ConfigService, MockValidationProvider, SerproValidationProvider],
      useFactory: (
        config: ConfigService,
        mock: MockValidationProvider,
        serpro: SerproValidationProvider,
      ) => {
        const chosen =
          config.get<string>('DOCUMENT_VALIDATION_PROVIDER') ?? 'mock';
        return chosen === 'serpro' ? serpro : mock;
      },
    },
  ],
  exports: [ValidationService, DOCUMENT_VALIDATION_PROVIDER],
})
export class ValidationModule {}
