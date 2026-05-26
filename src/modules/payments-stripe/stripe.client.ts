import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export const stripeClientProvider = {
  provide: STRIPE_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): InstanceType<typeof Stripe> => {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      throw new Error(
        'STRIPE_SECRET_KEY is missing — set the env before bootstrapping',
      );
    }
    return new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
  },
};

@Injectable()
export class StripeClientHolder {
  constructor(
    @Inject(STRIPE_CLIENT) public readonly stripe: InstanceType<typeof Stripe>,
  ) {}
}
