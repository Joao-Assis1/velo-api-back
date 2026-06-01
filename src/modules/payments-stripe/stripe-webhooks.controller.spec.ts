import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StripeWebhooksController } from './stripe-webhooks.controller';
import { PaymentsStripeService } from './payments-stripe.service';
import { StripeConnectService } from './stripe-connect.service';
import { STRIPE_CLIENT } from './stripe.client';
import { ConfigService } from '@nestjs/config';

describe('StripeWebhooksController', () => {
  let controller: StripeWebhooksController;
  let stripe: any;
  let payments: any;
  let connect: any;

  beforeEach(async () => {
    stripe = { webhooks: { constructEvent: jest.fn() } };
    payments = {
      handlePaymentIntentSucceeded: jest.fn(),
      handlePaymentIntentFailed: jest.fn(),
      handleTransferCreated: jest.fn(),
      handleTransferFailed: jest.fn(),
    };
    connect = { updateAccountStatus: jest.fn() };

    const mod: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhooksController],
      providers: [
        { provide: PaymentsStripeService, useValue: payments },
        { provide: StripeConnectService, useValue: connect },
        { provide: STRIPE_CLIENT, useValue: stripe },
        {
          provide: ConfigService,
          useValue: { get: () => 'whsec_test' },
        },
      ],
    }).compile();
    controller = mod.get(StripeWebhooksController);
  });

  it('rejects 400 when signature header is missing', async () => {
    await expect(
      controller.handle({ rawBody: Buffer.from('') } as any, ''),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects 400 when constructEvent throws (bad signature)', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    await expect(
      controller.handle({ rawBody: Buffer.from('{}') } as any, 't=1,v1=bad'),
    ).rejects.toThrow(BadRequestException);
  });

  it('routes payment_intent.succeeded to payments service', async () => {
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1' } },
    });
    payments.handlePaymentIntentSucceeded.mockResolvedValue(undefined);
    const res = await controller.handle(
      { rawBody: Buffer.from('{}') } as any,
      'sig',
    );
    expect(payments.handlePaymentIntentSucceeded).toHaveBeenCalledWith({
      id: 'pi_1',
    });
    expect(res).toEqual({ received: true });
  });

  it('routes account.updated to connect service', async () => {
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'account.updated',
      data: {
        object: {
          id: 'acct_1',
          payouts_enabled: true,
          charges_enabled: true,
          requirements: { disabled_reason: null },
        },
      },
    });
    connect.updateAccountStatus.mockResolvedValue(undefined);
    await controller.handle({ rawBody: Buffer.from('{}') } as any, 'sig');
    expect(connect.updateAccountStatus).toHaveBeenCalledWith('acct_1', {
      payouts_enabled: true,
      charges_enabled: true,
      requirements: { disabled_reason: null },
    });
  });

  it('returns received=true for unhandled event types', async () => {
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'unhandled.foo',
      data: { object: {} },
    });
    const r = await controller.handle(
      { rawBody: Buffer.from('{}') } as any,
      'sig',
    );
    expect(r).toEqual({ received: true });
  });
});
