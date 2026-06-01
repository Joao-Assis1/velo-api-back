import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StripeConnectService } from './stripe-connect.service';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from './stripe.client';
import { ConfigService } from '@nestjs/config';

describe('StripeConnectService', () => {
  let service: StripeConnectService;
  let prisma: any;
  let stripe: any;

  beforeEach(async () => {
    prisma = { instructor: { findUnique: jest.fn(), update: jest.fn() } };
    stripe = {
      accounts: { create: jest.fn(), retrieve: jest.fn() },
      accountLinks: { create: jest.fn() },
    };
    const config = {
      get: (k: string) => {
        if (k === 'STRIPE_CONNECT_REFRESH_URL')
          return 'http://localhost/refresh';
        if (k === 'STRIPE_CONNECT_RETURN_URL') return 'http://localhost/return';
        return undefined;
      },
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        StripeConnectService,
        { provide: PrismaService, useValue: prisma },
        { provide: STRIPE_CLIENT, useValue: stripe },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = mod.get(StripeConnectService);
  });

  describe('startOnboarding', () => {
    it('creates an Express account on first call and persists stripeAccountId', async () => {
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        email: 'r@b.com',
        stripeAccountId: null,
      });
      stripe.accounts.create.mockResolvedValue({ id: 'acct_NEW' });
      stripe.accountLinks.create.mockResolvedValue({
        url: 'https://connect.stripe.com/setup/...',
        expires_at: 1700000000,
      });
      const r = await service.startOnboarding('inst-1');
      expect(stripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'express',
          country: 'BR',
          email: 'r@b.com',
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
        }),
        { idempotencyKey: expect.any(String) },
      );
      expect(prisma.instructor.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: {
          stripeAccountId: 'acct_NEW',
          stripeAccountStatus: 'ONBOARDING',
        },
      });
      expect(r.url).toMatch(/connect\.stripe\.com/);
    });

    it('reuses account when stripeAccountId already exists', async () => {
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        email: 'r@b.com',
        stripeAccountId: 'acct_EXISTING',
        stripeAccountStatus: 'ONBOARDING',
      });
      stripe.accountLinks.create.mockResolvedValue({
        url: 'https://connect.stripe.com/setup/x',
        expires_at: 1700000000,
      });
      await service.startOnboarding('inst-1');
      expect(stripe.accounts.create).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('returns the cached status from Instructor row', async () => {
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        stripeAccountId: 'acct_X',
        stripeAccountStatus: 'ACTIVE',
        stripePayoutsEnabled: true,
      });
      const r = await service.getStatus('inst-1');
      expect(r.stripeAccountStatus).toBe('ACTIVE');
      expect(r.stripePayoutsEnabled).toBe(true);
    });

    it('throws NotFoundException when instructor does not exist', async () => {
      prisma.instructor.findUnique.mockResolvedValue(null);
      await expect(service.getStatus('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAccountStatus', () => {
    it('maps payouts_enabled=true + charges_enabled=true to ACTIVE', async () => {
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        stripeAccountId: 'acct_X',
      });
      prisma.instructor.update.mockResolvedValue({});
      await service.updateAccountStatus('acct_X', {
        payouts_enabled: true,
        charges_enabled: true,
        requirements: { disabled_reason: null },
      });
      expect(prisma.instructor.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: {
          stripeAccountStatus: 'ACTIVE',
          stripePayoutsEnabled: true,
        },
      });
    });

    it('maps disabled_reason set to RESTRICTED', async () => {
      prisma.instructor.findUnique.mockResolvedValue({
        id: 'inst-1',
        stripeAccountId: 'acct_X',
      });
      prisma.instructor.update.mockResolvedValue({});
      await service.updateAccountStatus('acct_X', {
        payouts_enabled: false,
        charges_enabled: false,
        requirements: { disabled_reason: 'rejected.terms_of_service' },
      });
      expect(prisma.instructor.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: {
          stripeAccountStatus: 'RESTRICTED',
          stripePayoutsEnabled: false,
        },
      });
    });
  });
});
