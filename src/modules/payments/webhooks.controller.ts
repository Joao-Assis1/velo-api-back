import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AsaasService } from './asaas.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly asaasService: AsaasService) {}

  @Post('asaas')
  handleAsaasWebhook(@Body() body: any) {
    this.logger.log('Received webhook from Asaas');
    return this.asaasService.handleWebhook(body);
  }
}
