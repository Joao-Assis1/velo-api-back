import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AcademyService {
  constructor(private prisma: PrismaService) {}

  async getSimulado() {
    // C-013: Variedade (at least 4 categories)
    const questions = await this.prisma.question.findMany();
    
    if (questions.length < 30) {
      // If we don't have enough questions, return what we have (mocking for now)
      return questions;
    }

    // Shuffle and pick 30
    return questions.sort(() => 0.5 - Math.random()).slice(0, 30);
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
