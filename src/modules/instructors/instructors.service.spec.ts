import { Test, TestingModule } from '@nestjs/testing';
import { InstructorsService } from './instructors.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  instructor: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('InstructorsService.findAll', () => {
  let service: InstructorsService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        InstructorsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = mod.get(InstructorsService);
    jest.clearAllMocks();
  });

  it('filters by isActive=true', async () => {
    mockPrisma.instructor.findMany.mockResolvedValue([]);
    await service.findAll();
    expect(mockPrisma.instructor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
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
      ],
    }).compile();
    service = module.get<InstructorsService>(InstructorsService);
    jest.clearAllMocks();
  });

  it('should throw NotFoundException when instructor not found', async () => {
    mockPrisma.instructor.findUnique.mockResolvedValue(null);
    await expect(service.seedTest('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should approve instructor for test', async () => {
    mockPrisma.instructor.findUnique.mockResolvedValue({
      id: 'inst-1',
    });
    mockPrisma.instructor.update.mockResolvedValue({
      id: 'inst-1',
      credentialStatus: 'APPROVED',
      isActive: true,
    });

    const result = await service.seedTest('inst-1');

    expect(mockPrisma.instructor.update).toHaveBeenCalledWith({
      where: { id: 'inst-1' },
      data: {
        credentialStatus: 'APPROVED',
        isActive: true,
      },
      select: {
        id: true,
        credentialStatus: true,
        isActive: true,
      },
    });
    expect(result.credentialStatus).toBe('APPROVED');
  });
});
