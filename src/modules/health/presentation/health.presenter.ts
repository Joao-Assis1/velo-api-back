import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../../common/interfaces/api-response.interface';
import { HealthStatusModel } from '../domain/health-status.model';

@Injectable()
export class HealthPresenter {
  present(model: HealthStatusModel): ApiResponse<HealthStatusModel> {
    return {
      success: true,
      message: 'API operacional.',
      data: model,
      timestamp: new Date().toISOString(),
    };
  }
}
