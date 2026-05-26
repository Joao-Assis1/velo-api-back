import { Test } from '@nestjs/testing';
import { InstructorsService } from './instructors.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InstructorsService.findAll', () => {
  let service: InstructorsService;
  let prisma: { instructor: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { instructor: { findMany: jest.fn() } };
    const mod = await Test.createTestingModule({
      providers: [
        InstructorsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = mod.get(InstructorsService);
  });

  it('filters by credentialStatus=APPROVED AND stripeAccountStatus=ACTIVE', async () => {
    prisma.instructor.findMany.mockResolvedValue([]);
    await service.findAll();
    expect(prisma.instructor.findMany).toHaveBeenCalledWith(
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
