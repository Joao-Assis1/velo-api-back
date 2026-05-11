import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AsaasService } from './asaas.service';
import { WebhooksController } from './webhooks.controller';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';

@Module({
  controllers: [PaymentsController, WebhooksController, DisputesController],
  providers: [PaymentsService, AsaasService, DisputesService],
  exports: [PaymentsService, AsaasService, DisputesService],
})
export class PaymentsModule {}
