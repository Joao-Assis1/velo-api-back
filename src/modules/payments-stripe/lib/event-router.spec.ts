import { routeStripeEvent } from './event-router';

describe('routeStripeEvent', () => {
  const handlers = {
    onPaymentIntentSucceeded: jest.fn(),
    onPaymentIntentFailed: jest.fn(),
    onTransferCreated: jest.fn(),
    onTransferFailed: jest.fn(),
  };

  beforeEach(() => {
    Object.values(handlers).forEach((h) => h.mockReset());
  });

  it('routes payment_intent.succeeded', async () => {
    await routeStripeEvent(
      {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1' } },
      } as any,
      handlers,
    );
    expect(handlers.onPaymentIntentSucceeded).toHaveBeenCalledWith({
      id: 'pi_1',
    });
  });

  it('routes payment_intent.payment_failed', async () => {
    await routeStripeEvent(
      {
        type: 'payment_intent.payment_failed',
        data: {
          object: { id: 'pi_2', last_payment_error: { message: 'no funds' } },
        },
      } as any,
      handlers,
    );
    expect(handlers.onPaymentIntentFailed).toHaveBeenCalled();
  });

  it('routes transfer.created and transfer.failed', async () => {
    await routeStripeEvent(
      { type: 'transfer.created', data: { object: { id: 'tr_1' } } } as any,
      handlers,
    );
    await routeStripeEvent(
      { type: 'transfer.failed', data: { object: { id: 'tr_2' } } } as any,
      handlers,
    );
    expect(handlers.onTransferCreated).toHaveBeenCalled();
    expect(handlers.onTransferFailed).toHaveBeenCalled();
  });

  it('returns false (ignored) for unknown event types', async () => {
    const handled = await routeStripeEvent(
      { type: 'unhandled.foo', data: { object: {} } } as any,
      handlers,
    );
    expect(handled).toBe(false);
  });
});
