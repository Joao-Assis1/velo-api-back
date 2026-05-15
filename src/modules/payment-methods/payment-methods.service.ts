import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(studentId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { studentId, isDeleted: false },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        stripePaymentMethodId: true,
        brand: true,
        last4: true,
        cardholderName: true,
        expiryMonth: true,
        expiryYear: true,
        isDefault: true,
      },
    });
  }

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
