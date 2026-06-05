import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AsaasClient, ASAAS_CLIENT } from './asaas.client';
import { PaymentsService } from './payments.service';

interface AsaasWebhookPayload {
  event: string;
  payment: {
    id: string;
    status: string;
    value: number;
  };
}

@Controller('webhooks')
export class AsaasWebhooksController {
  constructor(
    @Inject(ASAAS_CLIENT) private readonly asaas: AsaasClient,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('asaas')
  @HttpCode(200)
  async handleAsaasWebhook(
    @Headers('asaas-access-token') token: string,
    @Body() body: AsaasWebhookPayload,
  ): Promise<{ received: boolean }> {
    if (!this.asaas.verifyWebhookToken(token)) {
      throw new UnauthorizedException('Token de webhook inválido');
    }

    await this.paymentsService.handlePaymentWebhook(body.event, body.payment?.id);

    return { received: true };
  }
}
