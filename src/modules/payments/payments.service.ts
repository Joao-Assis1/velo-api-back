import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasService } from './asaas.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

interface ProcessPaymentData {
  studentId: string;
  lessonId: string;
  paymentMethodId: string;
  amount: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private asaasService: AsaasService,
  ) {}

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
    const pm = await this.prisma.paymentMethod.findUnique({
      where: { id: dto.paymentMethodId },
    });

    if (!pm || pm.studentId !== dto.studentId || pm.isDeleted) {
      throw new BadRequestException(
        'Método de pagamento inválido ou não pertencente ao aluno',
      );
    }

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });

    if (!student?.asaasCustomerId) {
      throw new BadRequestException(
        'Aluno sem cadastro no gateway de pagamento. Verifique seu perfil.',
      );
    }

    const dueDate = new Date().toISOString().split('T')[0];

    const charge = await this.asaasService.createCharge({
      customer: student.asaasCustomerId,
      billingType: 'CREDIT_CARD',
      value: dto.amount,
      dueDate,
      creditCardToken: pm.token,
      externalReference: dto.lessonId,
    });

    return this.prisma.payment.create({
      data: {
        amount: dto.amount,
        studentId: dto.studentId,
        lessonId: dto.lessonId,
        paymentMethodId: dto.paymentMethodId,
        status: 'PENDING',
        asaasId: charge.id,
      },
    });
  }

  async findAll(studentId?: string) {
    if (studentId) {
      return this.prisma.payment.findMany({
        where: { studentId },
        include: {
          paymentMethod: true,
          lesson: {
            include: { instructor: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.payment.findMany({
      include: {
        student: true,
        lesson: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { paymentMethod: true, lesson: true },
    });
    if (!payment) return null;

    let asaasStatus: string | null = null;
    if (payment.asaasId) {
      try {
        const asaasCharge = await this.asaasService.getCharge(payment.asaasId);
        asaasStatus = asaasCharge.status;
      } catch {
        // return local data if ASAAS is unavailable
      }
    }

    return { ...payment, asaasStatus };
  }

  async handleAsaasWebhook(body: any) {
    const { event, payment } = body;
    if (!payment?.id) return { success: true };

    const localPayment = await this.prisma.payment.findUnique({
      where: { asaasId: payment.id },
    });

    if (!localPayment) return { success: true };

    const statusMap: Record<string, string> = {
      PAYMENT_CONFIRMED: 'COMPLETED',
      PAYMENT_RECEIVED: 'COMPLETED',
      PAYMENT_OVERDUE: 'OVERDUE',
      PAYMENT_REFUNDED: 'REFUNDED',
    };

    const newStatus = statusMap[event];

    if (!newStatus) {
      this.logger.log(`Webhook event ${event} received — no status change`);
      return { success: true };
    }

    if (
      (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') &&
      localPayment.status === 'COMPLETED'
    ) {
      return { success: true };
    }

    await this.prisma.payment.update({
      where: { asaasId: payment.id },
      data: { status: newStatus },
    });

    this.logger.log(
      `Webhook: updated payment ${localPayment.id} to ${newStatus}`,
    );
    return { success: true };
  }
}
