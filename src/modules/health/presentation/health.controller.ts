import { Controller, Get } from '@nestjs/common';
import type { ApiResponse } from '../../../common/interfaces/api-response.interface';
import { GetHealthUseCase } from '../application/get-health.use-case';
import type { HealthStatusModel } from '../domain/health-status.model';
import { HealthPresenter } from './health.presenter';

@Controller('health')
export class HealthController {
  constructor(
    private readonly getHealthUseCase: GetHealthUseCase,
    private readonly healthPresenter: HealthPresenter,
  ) {}

  @Get()
  check(): ApiResponse<HealthStatusModel> {
    const health = this.getHealthUseCase.execute();
    return this.healthPresenter.present(health);
  }
}
