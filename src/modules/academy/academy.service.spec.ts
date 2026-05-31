import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AcademyService } from './academy.service';
import { PrismaService } from '../prisma/prisma.service';
import { DETRAN_QUESTIONS } from '../../../prisma/questions';

describe('AcademyService', () => {
  let service: AcademyService;
  let prisma: any;
  let cache: any;

  beforeEach(async () => {
    prisma = {
      question: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 30 }),
        findMany: jest.fn().mockResolvedValue(
          DETRAN_QUESTIONS.map((q, i) => ({ id: `q-${i}`, ...q })),
        ),
        count: jest.fn().mockResolvedValue(30),
      },
      studentSimuladoHistory: {
        create: jest.fn(),
      },
    };
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        AcademyService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = mod.get(AcademyService);
  });

  describe('seedQuestions', () => {
    it('trunca questões existentes e insere exatamente 30 questões DETRAN', async () => {
      await service.seedQuestions();

      expect(prisma.question.deleteMany).toHaveBeenCalledWith({});
      expect(prisma.question.createMany).toHaveBeenCalledWith({
        data: DETRAN_QUESTIONS,
      });
    });

    it('é idempotente — executa deleteMany mesmo se já houver questões', async () => {
      prisma.question.count.mockResolvedValue(40);

      await service.seedQuestions();

      expect(prisma.question.deleteMany).toHaveBeenCalledTimes(1);
      expect(prisma.question.createMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSimulado', () => {
    it('retorna exatamente 30 questões quando cache está vazio', async () => {
      const result = await service.getSimulado();
      expect(result).toHaveLength(30);
    });

    it('usa findMany para buscar questões quando cache está vazio', async () => {
      await service.getSimulado();
      expect(prisma.question.findMany).toHaveBeenCalled();
    });

    it('armazena no cache após buscar do banco', async () => {
      await service.getSimulado();
      expect(cache.set).toHaveBeenCalledWith(
        'academy:questions:pool',
        expect.any(Array),
        expect.any(Number),
      );
    });

    it('usa o cache quando disponível e não chama o banco', async () => {
      const cachedQuestions = DETRAN_QUESTIONS.map((q, i) => ({ id: `q-${i}`, ...q }));
      cache.get.mockResolvedValue(cachedQuestions);

      const result = await service.getSimulado();

      expect(prisma.question.findMany).not.toHaveBeenCalled();
      expect(result).toHaveLength(30);
    });
  });
});
