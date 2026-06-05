import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasClient, ASAAS_CLIENT } from './asaas.client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function chargeIdempotencyKey(lessonId: string): string {
  return `charge-${lessonId}`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ASAAS_CLIENT) private readonly asaas: AsaasClient,
  ) {}

  async charge(
    studentId: string,
    dto: { lessonId: string },
  ) {
    // 1. Find lesson and verify it belongs to this student
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada');
    if (lesson.studentId !== studentId) {
      throw new BadRequestException('Aula não pertence a este estudante');
    }

    // 2. Idempotency — return existing Payment if one already exists for this lesson
    const existing = await this.prisma.payment.findFirst({
      where: { lessonId: dto.lessonId },
    });
    if (existing) {
      this.logger.log(
        `Lesson ${dto.lessonId} already has Payment ${existing.id} (${existing.status}) — returning idempotently`,
      );
      return existing;
    }

    // 3. Find the student's active default payment method
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { studentId, isDefault: true, isDeleted: false },
    });
    if (!pm) {
      throw new BadRequestException(
        'Estudante não possui método de pagamento padrão — adicione um cartão primeiro',
      );
    }

    // 4. Validate student has Asaas customer ID
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { asaasCustomerId: true },
    });
    if (!student?.asaasCustomerId) {
      throw new BadRequestException(
        'Estudante não possui cadastro de pagamento — complete o registro primeiro',
      );
    }

    // 5. Validate instructor has a pixKey (required to receive transfers)
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: lesson.instructorId },
      select: { pixKey: true },
    });
    if (!instructor?.pixKey) {
      throw new BadRequestException(
        'Instrutor não possui chave PIX cadastrada — pagamento não pode ser processado',
      );
    }

    // 6. Call Asaas to create the charge
    const asaasResult = await this.asaas.charge(
      {
        customer: student.asaasCustomerId,
        billingType: 'CREDIT_CARD',
        value: lesson.price ?? 0,
        dueDate: todayISO(),
        creditCardToken: pm.asaasCreditCardToken,
        description: `Aula ${lesson.id}`,
      },
      chargeIdempotencyKey(dto.lessonId),
    );

    // 7. Persist Payment record with PENDING status
    const payment = await this.prisma.payment.create({
      data: {
        studentId,
        lessonId: lesson.id,
        paymentMethodId: pm.id,
        amount: lesson.price ?? 0,
        status: 'PENDING',
        asaasPaymentId: asaasResult.id,
      },
    });

    return payment;
  }

  async releaseEscrow(lessonId: string): Promise<void> {
    // 1. Find Payment by lessonId
    const payment = await this.prisma.payment.findFirst({ where: { lessonId } });
    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado para esta aula');
    }

    // 2. Idempotent: already RELEASED → no-op
    if (payment.status === 'RELEASED') {
      this.logger.log(`Payment ${payment.id} já está liberado — ignorando (idempotente)`);
      return;
    }

    // 3. Must be HELD to release
    if (payment.status !== 'HELD') {
      throw new BadRequestException(
        'Pagamento não está em custódia (HELD) — liberação não permitida',
      );
    }

    // 4. Load lesson and check compliance
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || !this.isValidForCompliance(lesson)) {
      throw new BadRequestException('Aula não atende os critérios de compliance');
    }

    // 5. Load instructor and verify PIX key
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: lesson.instructorId },
      select: { pixKey: true, pixKeyType: true },
    });
    if (!instructor?.pixKey || !instructor?.pixKeyType) {
      throw new BadRequestException('Instrutor não possui chave PIX cadastrada');
    }

    // 6. Compute split
    const { platformFeeAmount, instructorAmount } = this.computeSplit(payment.amount);

    // 7. Transfer to instructor via PIX
    const transfer = await this.asaas.transferPix(
      {
        value: instructorAmount,
        pixAddressKey: instructor.pixKey,
        pixAddressKeyType: instructor.pixKeyType as
          | 'CPF'
          | 'CNPJ'
          | 'EMAIL'
          | 'PHONE'
          | 'EVP',
        description: `Repasse aula ${lessonId}`,
      },
      `transfer-${payment.id}`,
    );

    // 8. Update Payment to RELEASED
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'RELEASED',
        asaasTransferId: transfer.id,
        platformFeeAmount,
        instructorAmount,
      },
    });
  }

  private isValidForCompliance(lesson: any): boolean {
    return (
      lesson !== null &&
      lesson !== undefined &&
      lesson.status === 'completed' &&
      (lesson.durationMinutes ?? 0) >= 50 &&
      lesson.biometryStartStatus === 'SUCCESS' &&
      lesson.biometryMidStatus === 'SUCCESS' &&
      lesson.biometryEndStatus === 'SUCCESS' &&
      lesson.integrityHash !== null &&
      lesson.disputeOpened === false
    );
  }

  private computeSplit(totalAmount: number): {
    platformFeeAmount: number;
    instructorAmount: number;
  } {
    const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 20) / 100;
    const platformFeeAmount = totalAmount * feePercent;
    const instructorAmount = totalAmount - platformFeeAmount;
    return { platformFeeAmount, instructorAmount };
  }

  async handlePaymentWebhook(event: string, asaasPaymentId: string): Promise<void> {
    const SUCCESS_EVENTS = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'];
    const FAILURE_EVENTS = ['PAYMENT_OVERDUE', 'PAYMENT_DELETED'];

    if (!SUCCESS_EVENTS.includes(event) && !FAILURE_EVENTS.includes(event)) return;

    const payment = await this.prisma.payment.findUnique({ where: { asaasPaymentId } });
    if (!payment) return;

    const targetStatus = SUCCESS_EVENTS.includes(event) ? 'HELD' : 'FAILED';
    if (payment.status === targetStatus) return;

    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: targetStatus } });
  }
}
