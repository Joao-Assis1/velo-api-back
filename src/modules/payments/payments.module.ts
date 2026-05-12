import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AsaasService } from './asaas.service';
import { WebhooksController } from './webhooks.controller';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';
import { EscrowService } from './escrow.service';

@Module({
  imports: [HttpModule],
  controllers: [PaymentsController, WebhooksController, DisputesController],
  providers: [PaymentsService, AsaasService, DisputesService, EscrowService],
  exports: [PaymentsService, AsaasService, DisputesService],
})
export class PaymentsModule {}
