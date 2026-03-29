import { Injectable } from '@nestjs/common';
import { HealthStatusModel } from '../domain/health-status.model';

@Injectable()
export class GetHealthUseCase {
  execute(): HealthStatusModel {
    return {
      status: 'ok',
      service: 'VELO-api',
      version: process.env.npm_package_version ?? '0.0.1',
    };
  }
}
