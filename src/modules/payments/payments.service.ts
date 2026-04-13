import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

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

  async findAll(studentId?: string) {
    if (studentId) {
      return this.prisma.payment.findMany({
        where: { studentId },
      });
    }
    return this.prisma.payment.findMany();
  }
}
