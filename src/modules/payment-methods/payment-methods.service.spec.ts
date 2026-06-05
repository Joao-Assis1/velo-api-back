import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { PrismaService } from '../prisma/prisma.service';
import { ASAAS_CLIENT } from '../payments/asaas.client';
import { CreatePaymentMethodDto } from './dtos';

// ---------------------------------------------------------------------------
// Helpers / Factories
// ---------------------------------------------------------------------------

const makeStudent = (overrides: object = {}) => ({
  id: 'student-uuid-1',
  email: 'aluno@test.com',
  name: 'Aluno Teste',
  cpf: '12345678901',
  phone: '11999990000',
  asaasCustomerId: null,
  ...overrides,
});

const makeDto = (overrides: Partial<CreatePaymentMethodDto> = {}): CreatePaymentMethodDto =>
  Object.assign(new CreatePaymentMethodDto(), {
    studentId: 'student-uuid-1',
    cardNumber: '4111111111111111',
    cardholderName: 'Aluno Teste',
    expiryMonth: '12',
    expiryYear: '2030',
    cvv: '123',
    postalCode: '01310-100',
    addressNumber: '10',
    ...overrides,
  });

const makePmRow = (overrides: object = {}) => ({
  id: 'pm-uuid-1',
  studentId: 'student-uuid-1',
  asaasCreditCardToken: 'token_4111111111111111',
  brand: 'visa',
  last4: '1111',
  cardholderName: 'Aluno Teste',
  expiryMonth: '12',
  expiryYear: '2030',
  isDefault: true,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  student: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  paymentMethod: {
    count: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAsaas = {
  createCustomer: jest.fn(),
  tokenizeCard: jest.fn(),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ASAAS_CLIENT, useValue: mockAsaas },
      ],
    }).compile();

    service = module.get<PaymentMethodsService>(PaymentMethodsService);
  });

  // -----------------------------------------------------------------------
  // addCard
  // -----------------------------------------------------------------------

  describe('addCard', () => {
    it('creates Asaas customer on first card (no asaasCustomerId yet)', async () => {
      const student = makeStudent({ asaasCustomerId: null });
      mockPrisma.student.findUnique.mockResolvedValue(student);
      mockAsaas.createCustomer.mockResolvedValue({ id: 'cus_asaas_new' });
      mockPrisma.student.update.mockResolvedValue({ ...student, asaasCustomerId: 'cus_asaas_new' });
      mockAsaas.tokenizeCard.mockResolvedValue({
        creditCardToken: 'token_4111111111111111',
        creditCardBrand: 'VISA',
        creditCardNumber: '1111',
      });
      mockPrisma.paymentMethod.count.mockResolvedValue(0);
      mockPrisma.paymentMethod.create.mockResolvedValue(makePmRow());

      await service.addCard('student-uuid-1', makeDto());

      expect(mockAsaas.createCustomer).toHaveBeenCalledWith({
        name: student.name,
        email: student.email,
        cpfCnpj: student.cpf,
      });
      expect(mockPrisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { asaasCustomerId: 'cus_asaas_new' },
        }),
      );
    });

    it('reuses existing Asaas customer', async () => {
      const student = makeStudent({ asaasCustomerId: 'cus_asaas_existing' });
      mockPrisma.student.findUnique.mockResolvedValue(student);
      mockAsaas.tokenizeCard.mockResolvedValue({
        creditCardToken: 'token_4111111111111111',
        creditCardBrand: 'VISA',
        creditCardNumber: '1111',
      });
      mockPrisma.paymentMethod.count.mockResolvedValue(1);
      mockPrisma.paymentMethod.create.mockResolvedValue(makePmRow({ isDefault: false }));

      await service.addCard('student-uuid-1', makeDto());

      expect(mockAsaas.createCustomer).not.toHaveBeenCalled();
      expect(mockPrisma.student.update).not.toHaveBeenCalled();
    });

    it('tokenizes card and stores asaasCreditCardToken + brand + last4', async () => {
      const student = makeStudent({ asaasCustomerId: 'cus_asaas_existing' });
      mockPrisma.student.findUnique.mockResolvedValue(student);
      mockAsaas.tokenizeCard.mockResolvedValue({
        creditCardToken: 'token_abc123',
        creditCardBrand: 'MASTERCARD',
        creditCardNumber: '5678',
      });
      mockPrisma.paymentMethod.count.mockResolvedValue(0);
      mockPrisma.paymentMethod.create.mockResolvedValue(
        makePmRow({ asaasCreditCardToken: 'token_abc123', brand: 'MASTERCARD', last4: '5678' }),
      );

      const result = await service.addCard('student-uuid-1', makeDto());

      expect(mockAsaas.tokenizeCard).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_asaas_existing',
          creditCard: expect.objectContaining({
            number: '4111111111111111',
            holderName: 'Aluno Teste',
          }),
        }),
      );
      expect(mockPrisma.paymentMethod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            asaasCreditCardToken: 'token_abc123',
            brand: 'MASTERCARD',
            last4: '5678',
          }),
        }),
      );
      expect(result).toHaveProperty('paymentMethod');
    });

    it('throws BadRequestException with pt-BR message on invalid card', async () => {
      const student = makeStudent({ asaasCustomerId: 'cus_asaas_existing' });
      mockPrisma.student.findUnique.mockResolvedValue(student);
      mockAsaas.tokenizeCard.mockRejectedValue(
        new BadRequestException('Número do cartão é inválido'),
      );

      await expect(service.addCard('student-uuid-1', makeDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when student does not exist', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);

      await expect(service.addCard('non-existent', makeDto())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // seedTest
  // -----------------------------------------------------------------------

  describe('seedTest', () => {
    it('creates Asaas customer + tokenizes test card 4111111111111111', async () => {
      const student = makeStudent({ asaasCustomerId: null });
      mockPrisma.student.findUnique.mockResolvedValue(student);
      mockAsaas.createCustomer.mockResolvedValue({ id: 'cus_asaas_seed' });
      mockPrisma.student.update.mockResolvedValue({ ...student, asaasCustomerId: 'cus_asaas_seed' });
      mockAsaas.tokenizeCard.mockResolvedValue({
        creditCardToken: 'token_seed_visa',
        creditCardBrand: 'VISA',
        creditCardNumber: '1111',
      });
      mockPrisma.paymentMethod.findFirst.mockResolvedValue(null);
      mockPrisma.paymentMethod.count.mockResolvedValue(0);
      mockPrisma.paymentMethod.create.mockResolvedValue(
        makePmRow({ asaasCreditCardToken: 'token_seed_visa' }),
      );

      const result = await service.seedTest('student-uuid-1');

      expect(mockAsaas.createCustomer).toHaveBeenCalledWith({
        name: student.name,
        email: student.email,
        cpfCnpj: student.cpf,
      });
      expect(mockAsaas.tokenizeCard).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_asaas_seed',
          creditCard: expect.objectContaining({ number: '4111111111111111' }),
        }),
      );
      expect(result).toHaveProperty('paymentMethod');
    });

    it('returns existing seeded record without re-tokenizing', async () => {
      const student = makeStudent({ asaasCustomerId: 'cus_asaas_seed' });
      mockPrisma.student.findUnique.mockResolvedValue(student);
      // Simulate tokenize returning same token
      mockAsaas.tokenizeCard.mockResolvedValue({
        creditCardToken: 'token_seed_visa',
        creditCardBrand: 'VISA',
        creditCardNumber: '1111',
      });
      mockPrisma.paymentMethod.findFirst.mockResolvedValue(makePmRow({ asaasCreditCardToken: 'token_seed_visa' }));

      const result = await service.seedTest('student-uuid-1');

      expect(mockPrisma.paymentMethod.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty('paymentMethod');
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------

  describe('remove', () => {
    it('soft-deletes payment method', async () => {
      const pm = makePmRow({ isDefault: false });
      mockPrisma.paymentMethod.findFirst.mockResolvedValue(pm);
      mockPrisma.paymentMethod.update.mockResolvedValue({ ...pm, isDeleted: true });

      const result = await service.remove('student-uuid-1', 'pm-uuid-1');

      expect(mockPrisma.paymentMethod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isDeleted: true, isDefault: false },
        }),
      );
      expect(result).toEqual({ ok: true });
    });

    it('promotes next card to default when deleting the default', async () => {
      const pm = makePmRow({ isDefault: true });
      const nextPm = makePmRow({ id: 'pm-uuid-2', isDefault: false });
      mockPrisma.paymentMethod.findFirst
        .mockResolvedValueOnce(pm)   // find target
        .mockResolvedValueOnce(nextPm); // find next
      mockPrisma.paymentMethod.update.mockResolvedValue({});

      await service.remove('student-uuid-1', 'pm-uuid-1');

      // Should have called update twice: soft-delete + promote next
      expect(mockPrisma.paymentMethod.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.paymentMethod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pm-uuid-2' },
          data: { isDefault: true },
        }),
      );
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.paymentMethod.findFirst.mockResolvedValue(null);

      await expect(service.remove('student-uuid-1', 'not-found')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // setDefault
  // -----------------------------------------------------------------------

  describe('setDefault', () => {
    it('sets new default and unsets previous', async () => {
      const pm = makePmRow({ id: 'pm-uuid-2', isDefault: false });
      mockPrisma.paymentMethod.findFirst.mockResolvedValue(pm);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.setDefault('student-uuid-1', 'pm-uuid-2');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.paymentMethod.findFirst.mockResolvedValue(null);

      await expect(service.setDefault('student-uuid-1', 'not-found')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
