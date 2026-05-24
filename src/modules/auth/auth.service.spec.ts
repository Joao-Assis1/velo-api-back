import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { JourneyService } from '../journey/journey.service';

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

const mockJwt = { signAsync: jest.fn().mockResolvedValue('mock-token') };
const mockJourney = { initForStudent: jest.fn().mockResolvedValue(undefined) };

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
    it('rotaciona: revoga o antigo e emite novo par', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'stu-1',
        role: 'student',
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('raw-refresh-token');

      expect(result.access_token).toBe('mock-token');
      expect(typeof result.refresh_token).toBe('string');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('rejeita token revogado', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', userId: 'stu-1', role: 'student',
        expiresAt: new Date(Date.now() + 1000000), revokedAt: new Date(),
      });
      await expect(service.refreshTokens('x')).rejects.toThrow();
    });

    it('rejeita token expirado', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', userId: 'stu-1', role: 'student',
        expiresAt: new Date(Date.now() - 1000), revokedAt: null,
      });
      await expect(service.refreshTokens('x')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('revoga o refresh token informado', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      await service.logout('raw-refresh-token');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
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
