export interface StripeEventHandlers {
  onPaymentIntentSucceeded(pi: { id: string }): Promise<void>;
  onPaymentIntentFailed(pi: { id: string; last_payment_error?: { message?: string } | null }): Promise<void>;
  onAccountUpdated(account: { id: string; payouts_enabled: boolean; charges_enabled: boolean; requirements?: any }): Promise<void>;
  onTransferCreated(transfer: { id: string }): Promise<void>;
  onTransferFailed(transfer: { id: string }): Promise<void>;
}

interface StripeEvent {
  type: string;
  data: { object: any };
}

export async function routeStripeEvent(
  event: StripeEvent,
  handlers: StripeEventHandlers,
): Promise<boolean> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlers.onPaymentIntentSucceeded(event.data.object);
      return true;
    case 'payment_intent.payment_failed':
      await handlers.onPaymentIntentFailed(event.data.object);
      return true;
    case 'account.updated':
      await handlers.onAccountUpdated(event.data.object);
      return true;
    case 'transfer.created':
      await handlers.onTransferCreated(event.data.object);
      return true;
    case 'transfer.failed':
      await handlers.onTransferFailed(event.data.object);
      return true;
    default:
      return false;
  }
}
