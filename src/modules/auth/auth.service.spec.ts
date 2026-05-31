import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { JourneyService } from '../journey/journey.service';
import { PaymentsStripeService } from '../payments-stripe/payments-stripe.service';
import { StripeConnectService } from '../payments-stripe/stripe-connect.service';
import { MailService } from '../mail/mail.service';

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
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const FAMILY_ID = 'family-uuid-1';

const mockJwt = { signAsync: jest.fn().mockResolvedValue('mock-token') };
const mockJourney = { initForStudent: jest.fn().mockResolvedValue(undefined) };
const mockPaymentsStripe = { provisionCustomer: jest.fn().mockResolvedValue(undefined) };
const mockStripeConnect = { provisionAccount: jest.fn().mockResolvedValue(undefined) };
const mockMail = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: JourneyService, useValue: mockJourney },
        { provide: PaymentsStripeService, useValue: mockPaymentsStripe },
        { provide: StripeConnectService, useValue: mockStripeConnect },
        { provide: MailService, useValue: mockMail },
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

    it('should register student and return token', async () => {
      mockPrisma.student.create.mockResolvedValue(createdStudent);

      const result = await service.register(registerDto as any, 'student');

      expect(result.access_token).toBe('mock-token');
      expect(result.user).not.toHaveProperty('password');
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
      expect(result).not.toHaveProperty('token');
      expect(mockPrisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'student-1' },
          data: expect.objectContaining({
            passwordResetToken: expect.any(String),
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

      expect(result).not.toHaveProperty('token');
      expect(mockPrisma.instructor.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'instructor-1' } }),
      );
    });
  });

  describe('login refresh token', () => {
    it('retorna access_token e refresh_token e persiste o hash', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        email: 'a@a.com',
        password: await require('bcrypt').hash('pass123', 10),
        paymentMethods: [],
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(
        { email: 'a@a.com', password: 'pass123' },
        'student',
      );

      expect(result.access_token).toBe('mock-token');
      expect(typeof result.refresh_token).toBe('string');
      expect(result.refresh_token.length).toBeGreaterThan(0);
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
      const arg = mockPrisma.refreshToken.create.mock.calls[0][0];
      expect(arg.data.userId).toBe('stu-1');
      expect(arg.data.role).toBe('student');
      expect(arg.data.tokenHash).not.toBe(result.refresh_token);
    });
  });

  describe('refreshTokens', () => {
    it('rotaciona: revoga o antigo atomicamente e emite novo par com mesmo familyId', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'stu-1',
        role: 'student',
        familyId: FAMILY_ID,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.student.findUnique.mockResolvedValue({ email: 'a@a.com' });

      const result = await service.refreshTokens('raw-refresh-token');

      expect(result.access_token).toBe('mock-token');
      expect(typeof result.refresh_token).toBe('string');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'rt-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      const createArg = mockPrisma.refreshToken.create.mock.calls[0][0];
      expect(createArg.data.familyId).toBe(FAMILY_ID);
    });

    it('rejeita token inexistente', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refreshTokens('x')).rejects.toThrow('Refresh token inválido');
    });

    it('revoga família e rejeita ao detectar reuso de token já revogado', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', userId: 'stu-1', role: 'student',
        familyId: FAMILY_ID,
        expiresAt: new Date(Date.now() + 1000000), revokedAt: new Date(),
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await expect(service.refreshTokens('stolen-token')).rejects.toThrow('Refresh token inválido');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: FAMILY_ID, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('revoga família e rejeita ao detectar corrida concorrente (count === 0)', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', userId: 'stu-1', role: 'student',
        familyId: FAMILY_ID,
        expiresAt: new Date(Date.now() + 1000000), revokedAt: null,
      });
      // First updateMany (conditional revoke) returns 0 → already consumed
      // Second updateMany (revokeFamily) returns count 0 too
      mockPrisma.refreshToken.updateMany
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValue({ count: 0 });

      await expect(service.refreshTokens('concurrent-token')).rejects.toThrow('Refresh token inválido');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenNthCalledWith(2, {
        where: { familyId: FAMILY_ID, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('rejeita token expirado', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', userId: 'stu-1', role: 'student',
        familyId: FAMILY_ID,
        expiresAt: new Date(Date.now() - 1000), revokedAt: null,
      });
      await expect(service.refreshTokens('x')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('retorna revoked: true quando token existia', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.logout('raw-refresh-token');
      expect(result).toEqual({ revoked: true });
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    });

    it('retorna revoked: false quando token não existia ou já estava revogado', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      const result = await service.logout('unknown-token');
      expect(result).toEqual({ revoked: false });
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

    it('should update student password and clear reset fields on success', async () => {
      mockPrisma.student.findFirst.mockResolvedValue({
        id: 'student-1',
        passwordResetToken: 'valid-token',
        passwordResetExpires: new Date(Date.now() + 3_600_000),
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
          data: expect.objectContaining({ passwordResetToken: null }),
        }),
      );
    });
  });
});
