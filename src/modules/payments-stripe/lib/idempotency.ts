import { createHash } from 'crypto';

export type IdempotentAction =
  | 'attach-payment-method'
  | 'detach-payment-method'
  | 'charge'
  | 'release'
  | 'refund'
  | 'connect-account'
  | 'connect-link';

export function idempotencyKey(
  subject: string,
  action: IdempotentAction | string,
): string {
  return createHash('sha256').update(`${subject}|${action}`).digest('hex');
}
