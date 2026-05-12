import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AsaasService } from '../payments/asaas.service';
import { BadRequestException } from '@nestjs/common';

const mockPrisma = {
  student: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  instructor: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = { signAsync: jest.fn().mockResolvedValue('mock-token') };

const mockAsaas = { createCustomer: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: AsaasService, useValue: mockAsaas },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register (student)', () => {
    const registerDto = {
      email: 'aluno@test.com',
      name: 'Aluno Test',
      password: 'pass123',
      phone: '11999999999',
      cpf: '12345678901',
      profilePicture: null,
      ladvUploaded: false,
      birthDate: null,
      motherName: null,
      ufDomicile: null,
      intendedCategory: null,
    };

    const createdStudent = {
      id: 'student-uuid',
      email: 'aluno@test.com',
      name: 'Aluno Test',
      password: 'hashed',
      cpf: '12345678901',
      phone: '11999999999',
      paymentMethods: [],
    };

    it('should call createCustomer with student data and update asaasCustomerId', async () => {
      mockPrisma.student.create.mockResolvedValue(createdStudent);
      mockAsaas.createCustomer.mockResolvedValue({ id: 'asaas-cust-id' });
      mockPrisma.student.update.mockResolvedValue({});

      const result = await service.register(registerDto as any, 'student');

      expect(mockAsaas.createCustomer).toHaveBeenCalledWith({
        name: createdStudent.name,
        email: createdStudent.email,
        cpfCnpj: createdStudent.cpf,
        phone: createdStudent.phone,
      });
      expect(mockPrisma.student.update).toHaveBeenCalledWith({
        where: { id: createdStudent.id },
        data: { asaasCustomerId: 'asaas-cust-id' },
      });
      expect(result.access_token).toBe('mock-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should still return success when createCustomer throws', async () => {
      mockPrisma.student.create.mockResolvedValue(createdStudent);
      mockAsaas.createCustomer.mockRejectedValue(new Error('ASAAS unavailable'));

      const result = await service.register(registerDto as any, 'student');

      expect(result.access_token).toBe('mock-token');
      expect(mockPrisma.student.update).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should return generic message when email not found', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);
      mockPrisma.instructor.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nao@existe.com' });

      expect(result.message).toBe('Se esse e-mail estiver cadastrado, você receberá um link em breve.');
      expect(result.token).toBeUndefined();
      expect(mockPrisma.student.update).not.toHaveBeenCalled();
      expect(mockPrisma.instructor.update).not.toHaveBeenCalled();
    });

    it('should generate token and update student when email found', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 'student-1', email: 'aluno@test.com' });
      mockPrisma.student.update.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'aluno@test.com' });

      expect(result.message).toBe('Se esse e-mail estiver cadastrado, você receberá um link em breve.');
      expect(typeof result.token).toBe('string');
      expect(result.token).toHaveLength(64); // 32 bytes hex = 64 chars
      expect(mockPrisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'student-1' },
          data: expect.objectContaining({
            passwordResetToken: result.token,
          }),
        }),
      );
    });

    it('should overwrite existing token on repeated call', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 'student-1', email: 'aluno@test.com' });
      mockPrisma.student.update.mockResolvedValue({});

      await service.forgotPassword({ email: 'aluno@test.com' });
      await service.forgotPassword({ email: 'aluno@test.com' });

      expect(mockPrisma.student.update).toHaveBeenCalledTimes(2);
    });

    it('should generate token and update instructor when email found', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);
      mockPrisma.instructor.findUnique.mockResolvedValue({ id: 'instructor-1', email: 'instrutor@test.com' });
      mockPrisma.instructor.update.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'instrutor@test.com' });

      expect(result.token).toHaveLength(64);
      expect(mockPrisma.instructor.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'instructor-1' } }),
      );
    });
  });

  describe('resetPassword', () => {
    it('should throw 400 when token not found', async () => {
      mockPrisma.student.findFirst.mockResolvedValue(null);
      mockPrisma.instructor.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid-token', newPassword: 'newpass123' }),
      ).rejects.toThrow(new BadRequestException('Token inválido ou expirado.'));
    });

    it('should throw 400 when token is expired', async () => {
      mockPrisma.student.findFirst.mockResolvedValue(null);
      mockPrisma.instructor.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'expired-token', newPassword: 'newpass123' }),
      ).rejects.toThrow(new BadRequestException('Token inválido ou expirado.'));
    });

    it('should update password and clear reset fields on success', async () => {
      mockPrisma.student.findFirst.mockResolvedValue({
        id: 'student-1',
        passwordResetToken: 'valid-token',
        passwordResetExpires: new Date(Date.now() + 3_600_000), // 1h from now
      });
      mockPrisma.student.update.mockResolvedValue({});

      const result = await service.resetPassword({ token: 'valid-token', newPassword: 'newpass123' });

      expect(result.message).toBe('Senha redefinida com sucesso.');
      expect(mockPrisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'student-1' },
          data: expect.objectContaining({
            passwordResetToken: null,
            passwordResetExpires: null,
          }),
        }),
      );
    });

    it('should update instructor password on success', async () => {
      mockPrisma.student.findFirst.mockResolvedValue(null);
      mockPrisma.instructor.findFirst.mockResolvedValue({
        id: 'instructor-1',
        passwordResetToken: 'valid-token',
        passwordResetExpires: new Date(Date.now() + 3_600_000),
      });
      mockPrisma.instructor.update.mockResolvedValue({});

      const result = await service.resetPassword({ token: 'valid-token', newPassword: 'newpass123' });

      expect(result.message).toBe('Senha redefinida com sucesso.');
      expect(mockPrisma.instructor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'instructor-1' },
          data: expect.objectContaining({ passwordResetToken: null, passwordResetExpires: null }),
        }),
      );
    });
  });
});
