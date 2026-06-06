import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ASAAS_CLIENT, AsaasClient } from '../payments/asaas.client';
import { CreatePaymentMethodDto } from './dtos';

const SEED_CARD_NUMBER = '4111111111111111';

@Injectable()
export class PaymentMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ASAAS_CLIENT) private readonly asaas: AsaasClient,
  ) {}

  // -------------------------------------------------------------------------
  // Internal: ensure Asaas customer exists for the student
  // -------------------------------------------------------------------------

  private async ensureAsaasCustomer(studentId: string): Promise<{
    customerId: string;
    student: {
      id: string;
      email: string;
      name: string;
      cpf: string;
      phone: string | null;
    };
  }> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        email: true,
        name: true,
        cpf: true,
        phone: true,
        asaasCustomerId: true,
      },
    });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);

    let customerId = student.asaasCustomerId;
    if (!customerId) {
      const customer = await this.asaas.createCustomer({
        name: student.name,
        email: student.email,
        cpfCnpj: student.cpf,
      });
      customerId = customer.id;
      await this.prisma.student.update({
        where: { id: studentId },
        data: { asaasCustomerId: customerId },
      });
    }

    return { customerId, student };
  }

  // -------------------------------------------------------------------------
  // addCard
  // -------------------------------------------------------------------------

  async addCard(studentId: string, dto: CreatePaymentMethodDto) {
    const { customerId, student } = await this.ensureAsaasCustomer(studentId);

    let tokenResult: {
      creditCardToken: string;
      creditCardBrand: string;
      creditCardNumber: string;
    };
    try {
      tokenResult = await this.asaas.tokenizeCard({
        customer: customerId,
        creditCard: {
          holderName: dto.cardholderName,
          number: dto.cardNumber.replace(/\s/g, ''),
          expiryMonth: dto.expiryMonth,
          expiryYear: dto.expiryYear,
          ccv: dto.cvv,
        },
        creditCardHolderInfo: {
          name: dto.cardholderName,
          email: student.email,
          cpfCnpj: student.cpf,
          postalCode: dto.postalCode ?? '00000-000',
          addressNumber: dto.addressNumber ?? '0',
          phone: student.phone ?? '',
        },
      });
    } catch (err: unknown) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Dados do cartão inválidos',
      );
    }

    const activeCount = await this.prisma.paymentMethod.count({
      where: { studentId, isDeleted: false },
    });

    const row = await this.prisma.paymentMethod.create({
      data: {
        studentId,
        asaasCreditCardToken: tokenResult.creditCardToken,
        brand: tokenResult.creditCardBrand,
        last4: tokenResult.creditCardNumber,
        cardholderName: dto.cardholderName,
        expiryMonth: dto.expiryMonth.padStart(2, '0'),
        expiryYear: dto.expiryYear,
        isDefault: dto.isDefault ?? activeCount === 0,
      },
    });

    return { paymentMethod: row };
  }

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  async findAll(studentId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { studentId, isDeleted: false },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        asaasCreditCardToken: true,
        brand: true,
        last4: true,
        cardholderName: true,
        expiryMonth: true,
        expiryYear: true,
        isDefault: true,
      },
    });
  }

  // -------------------------------------------------------------------------
  // seedTest
  // -------------------------------------------------------------------------

  async seedTest(studentId: string) {
    const { customerId, student } = await this.ensureAsaasCustomer(studentId);

    let tokenResult: {
      creditCardToken: string;
      creditCardBrand: string;
      creditCardNumber: string;
    };
    try {
      tokenResult = await this.asaas.tokenizeCard({
        customer: customerId,
        creditCard: {
          holderName: student.name,
          number: SEED_CARD_NUMBER,
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
        },
        creditCardHolderInfo: {
          name: student.name,
          email: student.email,
          cpfCnpj: student.cpf,
          postalCode: '00000-000',
          addressNumber: '0',
          phone: student.phone ?? '',
        },
      });
    } catch (err: unknown) {
      throw new BadRequestException(
        err instanceof Error
          ? err.message
          : 'Erro ao tokenizar cartão de teste',
      );
    }

    // Return existing record if token was already seeded
    const existingRecord = await this.prisma.paymentMethod.findFirst({
      where: { studentId, asaasCreditCardToken: tokenResult.creditCardToken },
    });
    if (existingRecord) {
      if (existingRecord.isDeleted) {
        const restored = await this.prisma.paymentMethod.update({
          where: { id: existingRecord.id },
          data: { isDeleted: false },
        });
        return { paymentMethod: restored };
      }
      return { paymentMethod: existingRecord };
    }

    const activeCount = await this.prisma.paymentMethod.count({
      where: { studentId, isDeleted: false },
    });

    const row = await this.prisma.paymentMethod.create({
      data: {
        studentId,
        asaasCreditCardToken: tokenResult.creditCardToken,
        brand: tokenResult.creditCardBrand,
        last4: tokenResult.creditCardNumber,
        cardholderName: student.name,
        expiryMonth: '12',
        expiryYear: '2030',
        isDefault: activeCount === 0,
      },
    });

    return { paymentMethod: row };
  }

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  async remove(studentId: string, id: string) {
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id, studentId, isDeleted: false },
    });
    if (!pm) throw new NotFoundException('Payment method not found');

    await this.prisma.paymentMethod.update({
      where: { id },
      data: { isDeleted: true, isDefault: false },
    });

    if (pm.isDefault) {
      const next = await this.prisma.paymentMethod.findFirst({
        where: { studentId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.paymentMethod.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return { ok: true };
  }

  // -------------------------------------------------------------------------
  // setDefault
  // -------------------------------------------------------------------------

  async setDefault(studentId: string, id: string) {
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id, studentId, isDeleted: false },
    });
    if (!pm) throw new NotFoundException('Payment method not found');
    await this.prisma.$transaction([
      this.prisma.paymentMethod.updateMany({
        where: { studentId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.paymentMethod.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
    return { ok: true };
  }
}
