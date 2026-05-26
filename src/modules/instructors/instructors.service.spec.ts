import { Test, TestingModule } from '@nestjs/testing';
import { InstructorsService } from './instructors.service';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from '../payments-stripe/stripe.client';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  instructor: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockStripe = {
  accounts: {
    create: jest.fn(),
  },
};

describe('InstructorsService.findAll', () => {
  let service: InstructorsService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        InstructorsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: STRIPE_CLIENT, useValue: mockStripe },
      ],
    }).compile();
    service = mod.get(InstructorsService);
    jest.clearAllMocks();
  });

  it('filters by credentialStatus=APPROVED AND stripeAccountStatus=ACTIVE', async () => {
    mockPrisma.instructor.findMany.mockResolvedValue([]);
    await service.findAll();
    expect(mockPrisma.instructor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          credentialStatus: 'APPROVED',
          stripeAccountStatus: 'ACTIVE',
          isActive: true,
        }),
      }),
    );
  });
});

describe('InstructorsService.seedTest', () => {
  let service: InstructorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstructorsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: STRIPE_CLIENT, useValue: mockStripe },
      ],
    }).compile();
    service = module.get<InstructorsService>(InstructorsService);
    jest.clearAllMocks();
  });

  it('should throw NotFoundException when instructor not found', async () => {
    mockPrisma.instructor.findUnique.mockResolvedValue(null);
    await expect(service.seedTest('non-existent-id')).rejects.toThrow(NotFoundException);
  });

  it('should create stripe account when stripeAccountId is absent', async () => {
    mockPrisma.instructor.findUnique.mockResolvedValue({
      id: 'inst-1',
      email: 'inst@test.com',
      name: 'Test Instructor',
      stripeAccountId: null,
    });
    mockStripe.accounts.create.mockResolvedValue({ id: 'acct_test_123' });
    mockPrisma.instructor.update.mockResolvedValue({
      id: 'inst-1',
      stripeAccountId: 'acct_test_123',
      stripeAccountStatus: 'ACTIVE',
      stripePayoutsEnabled: true,
    });

    const result = await service.seedTest('inst-1');

    expect(mockStripe.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'express', country: 'BR', email: 'inst@test.com' }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
    expect(mockPrisma.instructor.update).toHaveBeenCalledWith({
      where: { id: 'inst-1' },
      data: { stripeAccountId: 'acct_test_123', stripeAccountStatus: 'ACTIVE', stripePayoutsEnabled: true },
    });
    expect(result.stripeAccountId).toBe('acct_test_123');
  });

  it('should skip account creation when stripeAccountId already exists', async () => {
    mockPrisma.instructor.findUnique.mockResolvedValue({
      id: 'inst-1',
      email: 'inst@test.com',
      name: 'Test Instructor',
      stripeAccountId: 'acct_existing',
    });
    mockPrisma.instructor.update.mockResolvedValue({
      id: 'inst-1',
      stripeAccountId: 'acct_existing',
      stripeAccountStatus: 'ACTIVE',
      stripePayoutsEnabled: true,
    });

    await service.seedTest('inst-1');

    expect(mockStripe.accounts.create).not.toHaveBeenCalled();
    expect(mockPrisma.instructor.update).toHaveBeenCalledWith({
      where: { id: 'inst-1' },
      data: { stripeAccountId: 'acct_existing', stripeAccountStatus: 'ACTIVE', stripePayoutsEnabled: true },
    });
  });
});
