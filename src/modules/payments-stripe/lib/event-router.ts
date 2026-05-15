import type Stripe from 'stripe';

export interface StripeEventHandlers {
  onPaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void>;
  onPaymentIntentFailed(pi: Stripe.PaymentIntent): Promise<void>;
  onAccountUpdated(account: Stripe.Account): Promise<void>;
  onTransferCreated(transfer: Stripe.Transfer): Promise<void>;
  onTransferFailed(transfer: Stripe.Transfer): Promise<void>;
}

export async function routeStripeEvent(
  event: Stripe.Event,
  handlers: StripeEventHandlers,
): Promise<boolean> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlers.onPaymentIntentSucceeded(
        event.data.object as Stripe.PaymentIntent,
      );
      return true;
    case 'payment_intent.payment_failed':
      await handlers.onPaymentIntentFailed(
        event.data.object as Stripe.PaymentIntent,
      );
      return true;
    case 'account.updated':
      await handlers.onAccountUpdated(event.data.object as Stripe.Account);
      return true;
    case 'transfer.created':
      await handlers.onTransferCreated(event.data.object as Stripe.Transfer);
      return true;
    case 'transfer.failed':
      await handlers.onTransferFailed(event.data.object as Stripe.Transfer);
      return true;
    default:
      return false;
  }
}
