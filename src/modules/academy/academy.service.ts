import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

const SIMULADO_CACHE_KEY = 'academy:questions:pool';
const SIMULADO_CACHE_TTL = 10 * 60 * 1000; // 10 min — questões raramente mudam

@Injectable()
export class AcademyService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async getSimulado() {
    let pool = await this.cache.get<any[]>(SIMULADO_CACHE_KEY);

    if (!pool) {
      const total = await this.prisma.question.count();

      if (total < 30) {
        pool = await this.prisma.question.findMany();
      } else {
        pool = await this.prisma.$queryRaw<any[]>`
          SELECT id, text, category, options, correct
          FROM "Question"
          ORDER BY RANDOM()
          LIMIT 30
        `;
      }

      await this.cache.set(SIMULADO_CACHE_KEY, pool, SIMULADO_CACHE_TTL);
    }

    // Cada aluno recebe ordem embaralhada do pool cacheado
    return [...pool].sort(() => 0.5 - Math.random());
  }

  async submitSimulado(studentId: string, answers: { questionId: string; answer: number }[], startedAt: string) {
    const startTime = new Date(startedAt);
    const endTime = new Date();
    
    // C-012: Anti-fraude (15 minutes)
    const durationMs = endTime.getTime() - startTime.getTime();
    if (durationMs < 15 * 60 * 1000) {
      throw new BadRequestException('Simulado submitted too fast. Minimum time is 15 minutes.');
    }

    const questionIds = answers.map(a => a.questionId);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } }
    });

    let score = 0;
    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      if (question && question.correct === answer.answer) {
        score++;
      }
    }

    const passed = score >= 21; // 70% of 30

    return this.prisma.studentSimuladoHistory.create({
      data: {
        studentId,
        score,
        passed,
        startedAt: startTime,
        submittedAt: endTime,
      }
    });
  }

  async seedQuestions() {
    const count = await this.prisma.question.count();
    if (count > 0) return;

    const categories = ['Legislacao', 'Direcao Defensiva', 'Primeiros Socorros', 'Meio Ambiente', 'Mecanica'];
    const mockQuestions: any[] = [];

    for (let i = 1; i <= 40; i++) {
      mockQuestions.push({
        text: `Questão de teste ${i} sobre ${categories[i % 5]}?`,
        category: categories[i % 5],
        options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
        correct: Math.floor(Math.random() * 4)
      });
    }

    await this.prisma.question.createMany({
      data: mockQuestions
    });
  }
}
