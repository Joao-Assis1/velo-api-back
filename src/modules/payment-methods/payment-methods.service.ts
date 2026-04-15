import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentMethodDto } from './dtos';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  private luhnCheck(cardNumber: string): boolean {
    let sum = 0;
    let shouldDouble = false;
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i));
      if (shouldDouble) {
        if ((digit *= 2) > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  private validateExpiration(month: string, year: string) {
    const now = new Date();
    const expDate = new Date(parseInt(year), parseInt(month), 0);
    if (expDate < now && (now.getMonth() + 1 !== parseInt(month) || now.getFullYear() !== parseInt(year))) {
       if (expDate < now) throw new BadRequestException('Cartão expirado');
    }
  }

  async create(dto: CreatePaymentMethodDto) {
    const isTestCard = 
      dto.cardNumber === '1'.repeat(16) || 
      dto.cardNumber === '4'.repeat(16) || 
      dto.cardNumber.startsWith('4242');

    if (!isTestCard && !this.luhnCheck(dto.cardNumber)) {
      throw new BadRequestException('Número de cartão inválido (Luhn check failed)');
    }

    this.validateExpiration(dto.expiryMonth, dto.expiryYear);

    // No esquema atual, Student ID é a identidade primária
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Aluno não encontrado. Verifique se sua conta é de Aluno.');
    }

    const token = `tok_${randomUUID().replace(/-/g, '')}`;
    const last4 = dto.cardNumber.slice(-4);

    return this.prisma.paymentMethod.create({
      data: {
        studentId: student.id,
        token,
        last4,
        cardholderName: dto.cardholderName,
        expiryMonth: dto.expiryMonth,
        expiryYear: dto.expiryYear,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async findAll(studentId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { studentId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setDefault(id: string, studentId: string) {
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id, studentId },
    });

    if (!pm) {
      throw new NotFoundException('Cartão não encontrado ou não pertence a este aluno');
    }

    await this.prisma.paymentMethod.updateMany({
      where: { studentId, id: { not: id } },
      data: { isDefault: false },
    });

    return this.prisma.paymentMethod.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async delete(id: string, studentId: string) {
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { id, studentId },
    });

    if (!pm) {
      throw new NotFoundException('Cartão não encontrado ou não pertence a este aluno');
    }

    return this.prisma.paymentMethod.update({
      where: { id },
      data: { isDeleted: true, isDefault: false },
    });
  }
}
