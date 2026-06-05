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
}
