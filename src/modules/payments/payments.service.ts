import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

interface ProcessPaymentData {
  studentId: string;
  lessonId: string;
  paymentMethodId: string;
  amount: number;
}

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        amount: createPaymentDto.amount,
        studentId: createPaymentDto.studentId,
        lessonId: createPaymentDto.lessonId,
        status: 'PENDING',
      },
    });
  }

  async processPayment(dto: ProcessPaymentData) {
    // Validar se o método de pagamento pertence ao aluno
    const pm = await this.prisma.paymentMethod.findUnique({
      where: { id: dto.paymentMethodId },
    });

    if (!pm || pm.studentId !== dto.studentId || pm.isDeleted) {
      throw new BadRequestException('Método de pagamento inválido ou não pertencente ao aluno');
    }

    // Criar o pagamento (Simulando sucesso imediato no MVP)
    return this.prisma.payment.create({
      data: {
        amount: dto.amount,
        studentId: dto.studentId,
        lessonId: dto.lessonId,
        paymentMethodId: dto.paymentMethodId,
        status: 'COMPLETED',
      },
    });
  }

  async findAll(studentId?: string) {
    if (studentId) {
      return this.prisma.payment.findMany({
        where: { studentId },
        include: {
          paymentMethod: true,
          lesson: true,
        },
      });
    }
    return this.prisma.payment.findMany({
      include: {
        student: true,
        lesson: true,
      },
    });
  }
}
