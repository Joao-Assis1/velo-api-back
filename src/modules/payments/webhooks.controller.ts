import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly webhookToken: string;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {
    this.webhookToken =
      this.configService.get<string>('ASAAS_WEBHOOK_TOKEN') ?? '';
  }

  @Post('asaas')
  async handleAsaasWebhook(
    @Headers('asaas-access-token') token: string,
    @Body() body: any,
  ) {
    if (this.webhookToken && token !== this.webhookToken) {
      throw new UnauthorizedException('Invalid webhook token');
    }
    this.logger.log(
      `Received webhook: ${body?.event} for payment ${body?.payment?.id}`,
    );
    return this.paymentsService.handleAsaasWebhook(body);
  }
}
