import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { DETRAN_QUESTIONS } from '../../../prisma/questions';

const SIMULADO_CACHE_KEY = 'academy:questions:pool';
const SIMULADO_CACHE_TTL = 10 * 60 * 1000;

@Injectable()
export class AcademyService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async getSimulado() {
    let pool = await this.cache.get<any[]>(SIMULADO_CACHE_KEY);

    if (!pool) {
      pool = await this.prisma.question.findMany();
      await this.cache.set(SIMULADO_CACHE_KEY, pool, SIMULADO_CACHE_TTL);
    }

    return [...pool].sort(() => 0.5 - Math.random());
  }

  async submitSimulado(
    studentId: string,
    answers: { questionId: string; answer: number }[],
    startedAt: string,
  ) {
    const startTime = new Date(startedAt);
    const endTime = new Date();

    const durationMs = endTime.getTime() - startTime.getTime();
    if (durationMs < 15 * 60 * 1000) {
      throw new BadRequestException(
        'Simulado submitted too fast. Minimum time is 15 minutes.',
      );
    }

    const questionIds = answers.map((a) => a.questionId);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
    });

    let score = 0;
    for (const answer of answers) {
      const question = questions.find((q) => q.id === answer.questionId);
      if (question && question.correct === answer.answer) {
        score++;
      }
    }

    const passed = score >= 21;

    return this.prisma.studentSimuladoHistory.create({
      data: {
        studentId,
        score,
        passed,
        startedAt: startTime,
        submittedAt: endTime,
      },
    });
  }

  async seedQuestions() {
    await this.prisma.question.deleteMany({});
    await this.prisma.question.createMany({ data: DETRAN_QUESTIONS });
    return { seeded: DETRAN_QUESTIONS.length };
  }
}
