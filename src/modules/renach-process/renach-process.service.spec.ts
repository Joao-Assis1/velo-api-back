import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RenachProcessService } from './renach-process.service';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';

describe('RenachProcessService', () => {
  let service: RenachProcessService;
  let prisma: {
    renachProcess: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
  };
  let journey: { refresh: jest.Mock };

  beforeEach(async () => {
    prisma = {
      renachProcess: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    journey = {
      refresh: jest.fn().mockResolvedValue({ stage: 'AWAITING_LADV_UPLOAD' }),
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        RenachProcessService,
        { provide: PrismaService, useValue: prisma },
        { provide: JourneyService, useValue: journey },
      ],
    }).compile();
    service = mod.get(RenachProcessService);
  });

  describe('getMine', () => {
    it('returns the current renach process', async () => {
      prisma.renachProcess.findUnique.mockResolvedValue({
        id: 'r1',
        ufDetran: 'MS',
        status: 'PENDING',
      });
      const r = await service.getMine('stu-1');
      expect(r.id).toBe('r1');
    });

    it('throws NotFoundException when no process exists', async () => {
      prisma.renachProcess.findUnique.mockResolvedValue(null);
      await expect(service.getMine('stu-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getGuide', () => {
    it('returns UF-specific guidance for MS (Mato Grosso do Sul)', () => {
      const g = service.getGuide('MS');
      expect(g.uf).toBe('MS');
      expect(g.steps).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/detran.*ms|mato grosso do sul/i),
        ]),
      );
    });

    it('returns generic guidance for any UF that is not MS', () => {
      const g = service.getGuide('SP');
      expect(g.uf).toBe('SP');
      expect(g.steps.length).toBeGreaterThan(0);
      // generic guide must NOT contain the MS-specific portal hint
      expect(g.steps.every((s) => !/detran-ms\.gov\.br/i.test(s))).toBe(true);
    });
  });

  describe('schedule', () => {
    it('upserts a PENDING/SCHEDULED process and refreshes journey', async () => {
      prisma.renachProcess.upsert.mockResolvedValue({
        id: 'r1',
        ufDetran: 'MS',
        status: 'SCHEDULED',
      });
      const r = await service.schedule('stu-1', { uf: 'MS' });
      expect(prisma.renachProcess.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 'stu-1' },
          create: expect.objectContaining({
            studentId: 'stu-1',
            ufDetran: 'MS',
            status: 'SCHEDULED',
          }),
          update: expect.objectContaining({
            ufDetran: 'MS',
            status: 'SCHEDULED',
          }),
        }),
      );
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
      expect(r.status).toBe('SCHEDULED');
    });
  });

  describe('complete', () => {
    it('marks DONE with renachNumber and biometryDoneAt, refreshes journey', async () => {
      prisma.renachProcess.findUnique.mockResolvedValue({
        id: 'r1',
        studentId: 'stu-1',
        ufDetran: 'MS',
        status: 'SCHEDULED',
      });
      prisma.renachProcess.update.mockResolvedValue({
        id: 'r1',
        studentId: 'stu-1',
        ufDetran: 'MS',
        renachNumber: 'RNC-2026-00001',
        biometryDoneAt: new Date(),
        status: 'DONE',
      });
      const r = await service.complete('stu-1', {
        renachNumber: 'RNC-2026-00001',
        biometryDoneAt: new Date('2026-05-14T10:00:00Z'),
      });
      expect(prisma.renachProcess.update).toHaveBeenCalledWith({
        where: { studentId: 'stu-1' },
        data: expect.objectContaining({
          renachNumber: 'RNC-2026-00001',
          biometryDoneAt: expect.any(Date),
          status: 'DONE',
        }),
      });
      expect(journey.refresh).toHaveBeenCalledWith('stu-1');
      expect(r.status).toBe('DONE');
    });

    it('throws BadRequestException when no process exists yet', async () => {
      prisma.renachProcess.findUnique.mockResolvedValue(null);
      await expect(
        service.complete('stu-1', {
          renachNumber: 'RNC-2026-00001',
          biometryDoneAt: new Date(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
