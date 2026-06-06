import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AsaasWebhooksController } from './asaas-webhooks.controller';
import { PaymentsService } from './payments.service';
import { ASAAS_CLIENT } from './asaas.client';

describe('AsaasWebhooksController', () => {
  let controller: AsaasWebhooksController;
  let paymentsService: jest.Mocked<
    Pick<PaymentsService, 'handlePaymentWebhook' | 'handleTransferWebhook'>
  >;
  let asaasClient: { verifyWebhookToken: jest.Mock };

  beforeEach(async () => {
    paymentsService = {
      handlePaymentWebhook: jest.fn().mockResolvedValue(undefined),
      handleTransferWebhook: jest.fn().mockResolvedValue(undefined),
    };

    asaasClient = {
      verifyWebhookToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsaasWebhooksController],
      providers: [
        { provide: PaymentsService, useValue: paymentsService },
        { provide: ASAAS_CLIENT, useValue: asaasClient },
      ],
    }).compile();

    controller = module.get<AsaasWebhooksController>(AsaasWebhooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /webhooks/asaas', () => {
    const validPayload = {
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_asaas_123', status: 'CONFIRMED', value: 150 },
    };

    it('returns 401 when token is invalid', async () => {
      asaasClient.verifyWebhookToken.mockReturnValue(false);

      await expect(
        controller.handleAsaasWebhook('bad-token', validPayload),
      ).rejects.toThrow(UnauthorizedException);

      expect(paymentsService.handlePaymentWebhook).not.toHaveBeenCalled();
    });

    it('handles PAYMENT_CONFIRMED and returns { received: true }', async () => {
      asaasClient.verifyWebhookToken.mockReturnValue(true);

      const result = await controller.handleAsaasWebhook('valid-token', {
        event: 'PAYMENT_CONFIRMED',
        payment: { id: 'pay_asaas_123', status: 'CONFIRMED', value: 150 },
      });

      expect(paymentsService.handlePaymentWebhook).toHaveBeenCalledWith(
        'PAYMENT_CONFIRMED',
        'pay_asaas_123',
      );
      expect(result).toEqual({ received: true });
    });

    it('handles PAYMENT_OVERDUE event', async () => {
      asaasClient.verifyWebhookToken.mockReturnValue(true);

      await controller.handleAsaasWebhook('valid-token', {
        event: 'PAYMENT_OVERDUE',
        payment: { id: 'pay_asaas_456', status: 'OVERDUE', value: 200 },
      });

      expect(paymentsService.handlePaymentWebhook).toHaveBeenCalledWith(
        'PAYMENT_OVERDUE',
        'pay_asaas_456',
      );
    });

    it('handles unknown event (no-op, still returns received: true)', async () => {
      asaasClient.verifyWebhookToken.mockReturnValue(true);

      const result = await controller.handleAsaasWebhook('valid-token', {
        event: 'REFUND_CREATED',
        payment: { id: 'pay_asaas_789', status: 'REFUNDED', value: 100 },
      });

      expect(paymentsService.handlePaymentWebhook).toHaveBeenCalledWith(
        'REFUND_CREATED',
        'pay_asaas_789',
      );
      expect(result).toEqual({ received: true });
    });

    it('TRANSFER_DONE body: routes to handleTransferWebhook', async () => {
      asaasClient.verifyWebhookToken.mockReturnValue(true);

      const result = await controller.handleAsaasWebhook('valid-token', {
        event: 'TRANSFER_DONE',
        transfer: { id: 'transfer_asaas_001', status: 'DONE' },
      });

      expect(paymentsService.handleTransferWebhook).toHaveBeenCalledWith(
        'TRANSFER_DONE',
        'transfer_asaas_001',
      );
      expect(paymentsService.handlePaymentWebhook).not.toHaveBeenCalled();
      expect(result).toEqual({ received: true });
    });

    it('TRANSFER_FAILED body: routes to handleTransferWebhook', async () => {
      asaasClient.verifyWebhookToken.mockReturnValue(true);

      const result = await controller.handleAsaasWebhook('valid-token', {
        event: 'TRANSFER_FAILED',
        transfer: { id: 'transfer_asaas_002', status: 'FAILED' },
      });

      expect(paymentsService.handleTransferWebhook).toHaveBeenCalledWith(
        'TRANSFER_FAILED',
        'transfer_asaas_002',
      );
      expect(paymentsService.handlePaymentWebhook).not.toHaveBeenCalled();
      expect(result).toEqual({ received: true });
    });
  });
});
