import { Module } from '@nestjs/common';
import { GetHealthUseCase } from './application/get-health.use-case';
import { HealthController } from './presentation/health.controller';
import { HealthPresenter } from './presentation/health.presenter';

@Module({
  controllers: [HealthController],
  providers: [GetHealthUseCase, HealthPresenter],
})
export class HealthModule {}
