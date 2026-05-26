import { Test, TestingModule } from '@nestjs/testing';
import { EscrowRetryService } from './escrow-retry.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsStripeService } from './payments-stripe.service';

describe('EscrowRetryService', () => {
  let service: EscrowRetryService;
  let prisma: { payment: { findMany: jest.Mock; update: jest.Mock } };
  let paymentsStripe: { releaseEscrow: jest.Mock };

  beforeEach(async () => {
    prisma = { payment: { findMany: jest.fn(), update: jest.fn() } };
    paymentsStripe = { releaseEscrow: jest.fn() };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowRetryService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsStripeService, useValue: paymentsStripe },
      ],
    }).compile();

    service = mod.get(EscrowRetryService);
  });

  it('does nothing when there are no HELD payments', async () => {
    prisma.payment.findMany.mockResolvedValue([]);
    await service.retryPendingReleases();
    expect(paymentsStripe.releaseEscrow).not.toHaveBeenCalled();
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('queries only HELD payments for completed lessons', async () => {
    prisma.payment.findMany.mockResolvedValue([]);
    await service.retryPendingReleases();
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lesson: { status: 'completed' } }),
      }),
    );
  });

  it('skips payments with no lessonId', async () => {
    prisma.payment.findMany.mockResolvedValue([
      { id: 'pay-1', lessonId: null, releaseAttempts: 0 },
    ]);
    await service.retryPendingReleases();
    expect(paymentsStripe.releaseEscrow).not.toHaveBeenCalled();
  });

  it('releases escrow and does not update on success', async () => {
    prisma.payment.findMany.mockResolvedValue([
      { id: 'pay-1', lessonId: 'lsn-1', releaseAttempts: 1 },
    ]);
    paymentsStripe.releaseEscrow.mockResolvedValue(undefined);

    await service.retryPendingReleases();

    expect(paymentsStripe.releaseEscrow).toHaveBeenCalledWith('lsn-1');
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('increments releaseAttempts and keeps HELD status when not exhausted', async () => {
    prisma.payment.findMany.mockResolvedValue([
      { id: 'pay-1', lessonId: 'lsn-1', releaseAttempts: 0 },
    ]);
    paymentsStripe.releaseEscrow.mockRejectedValue(new Error('Stripe down'));

    await service.retryPendingReleases();

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: expect.objectContaining({
        releaseAttempts: 1,
        lastReleaseAttemptAt: expect.any(Date),
      }),
    });
    const updateCall = prisma.payment.update.mock.calls[0][0];
    expect(updateCall.data.status).toBeUndefined();
  });

  it('sets status RELEASE_FAILED when attempts are exhausted', async () => {
    prisma.payment.findMany.mockResolvedValue([
      { id: 'pay-1', lessonId: 'lsn-1', releaseAttempts: 2 },
    ]);
    paymentsStripe.releaseEscrow.mockRejectedValue(new Error('Stripe error'));

    await service.retryPendingReleases();

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: expect.objectContaining({
        releaseAttempts: 3,
        lastReleaseAttemptAt: expect.any(Date),
        status: 'RELEASE_FAILED',
      }),
    });
  });

  it('processes multiple payments independently', async () => {
    prisma.payment.findMany.mockResolvedValue([
      { id: 'pay-1', lessonId: 'lsn-1', releaseAttempts: 0 },
      { id: 'pay-2', lessonId: 'lsn-2', releaseAttempts: 0 },
    ]);
    paymentsStripe.releaseEscrow
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('fail'));

    await service.retryPendingReleases();

    expect(paymentsStripe.releaseEscrow).toHaveBeenCalledTimes(2);
    expect(prisma.payment.update).toHaveBeenCalledTimes(1);
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pay-2' } }),
    );
  });
});
