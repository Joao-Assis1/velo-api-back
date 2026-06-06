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

interface AsaasPaymentWebhookPayload {
  event: string;
  payment?: {
    id: string;
    status: string;
    value: number;
  };
  transfer?: {
    id: string;
    status: string;
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
    @Body() body: AsaasPaymentWebhookPayload,
  ): Promise<{ received: boolean }> {
    if (!this.asaas.verifyWebhookToken(token)) {
      throw new UnauthorizedException('Token de webhook inválido');
    }

    if (body.transfer?.id) {
      await this.paymentsService.handleTransferWebhook(
        body.event,
        body.transfer.id,
      );
    } else if (body.payment?.id) {
      await this.paymentsService.handlePaymentWebhook(
        body.event,
        body.payment.id,
      );
    }

    return { received: true };
  }
}
