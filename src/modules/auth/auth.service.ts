import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Student, Instructor } from '@prisma/client';
import { JourneyService } from '../journey/journey.service';
import { PaymentsStripeService } from '../payments-stripe/payments-stripe.service';
import { StripeConnectService } from '../payments-stripe/stripe-connect.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly journeyService: JourneyService,
    private readonly paymentsStripeService: PaymentsStripeService,
    private readonly stripeConnectService: StripeConnectService,
    private readonly mailService: MailService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueRefreshToken(
    userId: string,
    role: 'student' | 'instructor',
    familyId?: string,
  ): Promise<string> {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(token),
        userId,
        role,
        familyId: familyId ?? randomUUID(),
        expiresAt,
      },
    });
    return token;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async getUserEmail(
    userId: string,
    role: 'student' | 'instructor',
  ): Promise<string> {
    if (role === 'student') {
      const user = await this.prisma.student.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email ?? '';
    }
    const user = await this.prisma.instructor.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? '';
  }

  async login(loginDto: LoginDto, role: 'student' | 'instructor') {
    let user: Student | Instructor | null;
    if (role === 'student') {
      user = await this.prisma.student.findUnique({
        where: { email: loginDto.email },
        include: { paymentMethods: true },
      });
    } else {
      user = await this.prisma.instructor.findUnique({
        where: { email: loginDto.email },
        include: { availabilities: true, busySlots: true, vehicles: true },
      });
    }

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: user.id, email: user.email, role };
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = await this.issueRefreshToken(user.id, role);

    // Remove password before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return {
      access_token,
      refresh_token,
      user: userWithoutPassword,
    };
  }

  async register(registerDto: RegisterDto, role: 'student' | 'instructor') {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    let user: Student | Instructor;
    try {
      if (role === 'student') {
        user = await this.prisma.student.create({
          data: {
            email: registerDto.email,
            name: registerDto.name,
            password: hashedPassword,
            phone: registerDto.phone,
            cpf: registerDto.cpf!,
            profilePicture: registerDto.profilePicture,
            ladvUploaded: registerDto.ladvUploaded,
            birthDate: registerDto.birthDate,
            motherName: registerDto.motherName,
            ufDomicile: registerDto.ufDomicile,
            intendedCategory: registerDto.intendedCategory,
          },
          include: { paymentMethods: true },
        });
        try {
          await this.journeyService.initForStudent(user.id);
        } catch (err) {
          this.logger.error(`Failed to initialize journey for student ${user.id}: ${err}`);
        }
        this.paymentsStripeService
          .provisionCustomer(user.id, user.email, user.name)
          .catch((err) => this.logger.error(`Failed to provision Stripe customer for student ${user.id}: ${err}`));
      } else {
        user = await this.prisma.instructor.create({
          data: {
            email: registerDto.email,
            name: registerDto.name,
            password: hashedPassword,
            phone: registerDto.phone,
            cpf: registerDto.cpf,
            profilePicture: registerDto.profilePicture,
            instructorType: registerDto.instructorType,
            bio: registerDto.bio,
            location: registerDto.location,
            pricePerClass: registerDto.pricePerClass,
            cnhNumber: registerDto.cnhNumber,
            cnhCategory: registerDto.cnhCategory,
            cnhExpiry: registerDto.cnhExpiry,
            cnhEar: registerDto.cnhEar,
            certidaoNegativa: registerDto.certidaoNegativa,
            birthDate: registerDto.birthDate,
            educationLevel: registerDto.educationLevel,
            renachNumber: registerDto.renachNumber,
            vehicles: (registerDto.vehiclePlate && registerDto.vehicleModel) ? {
              create: {
                plate: registerDto.vehiclePlate,
                model: registerDto.vehicleModel,
                year: registerDto.vehicleYear,
                transmission: registerDto.transmission,
              }
            } : undefined,
          },
          include: { availabilities: true, busySlots: true, vehicles: true },
        });
        this.stripeConnectService
          .provisionAccount(user.id, user.email)
          .catch((err) => this.logger.error(`Failed to provision Stripe account for instructor ${user.id}: ${err}`));
      }
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        const target = (e as any)?.meta?.target as string[] | undefined;
        if (target?.includes('cpf')) throw new BadRequestException('CPF já cadastrado.');
        throw new BadRequestException('E-mail já está em uso.');
      }
      throw e;
    }

    const payload = { sub: user.id, email: user.email, role };
    const access_token = await this.jwtService.signAsync(payload);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return {
      access_token,
      user: userWithoutPassword,
    };
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Reuse detected: already revoked → entire family is compromised
    if (record.revokedAt) {
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Atomic conditional revoke — wins the race only if revokedAt is still null
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (count === 0) {
      // Concurrent request already consumed this token
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException('Refresh token inválido');
    }

    const role = record.role as 'student' | 'instructor';
    const email = await this.getUserEmail(record.userId, role);
    const payload = { sub: record.userId, email, role };
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = await this.issueRefreshToken(record.userId, role, record.familyId);

    return { access_token, refresh_token };
  }

  async logout(refreshToken: string): Promise<{ revoked: boolean }> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: count > 0 };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; token?: string }> {
    const message = 'Se esse e-mail estiver cadastrado, você receberá um link em breve.';
    const testMode = process.env.ENABLE_TEST_MODE === 'true';

    let userId: string | null = null;
    let userRole: 'student' | 'instructor' | null = null;
    let userEmail: string | null = null;

    const student = await this.prisma.student.findUnique({ where: { email: dto.email } });
    if (student) {
      userId = student.id;
      userRole = 'student';
      userEmail = student.email;
    } else {
      const instructor = await this.prisma.instructor.findUnique({ where: { email: dto.email } });
      if (instructor) {
        userId = instructor.id;
        userRole = 'instructor';
        userEmail = instructor.email;
      }
    }

    if (!userId || !userRole || !userEmail) {
      return { message };
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3_600_000); // 1h

    if (userRole === 'student') {
      await this.prisma.student.update({
        where: { id: userId },
        data: { passwordResetToken: token, passwordResetExpires: expires },
      });
    } else {
      await this.prisma.instructor.update({
        where: { id: userId },
        data: { passwordResetToken: token, passwordResetExpires: expires },
      });
    }

    // Fire-and-forget: log on failure but don't break the response.
    this.mailService.sendPasswordReset(userEmail, token).catch((err) =>
      this.logger.error(`Failed to send password reset email to ${userEmail}: ${err}`),
    );

    // In test mode the token is also returned directly so the frontend can complete the flow without checking email.
    if (testMode) {
      return { message, token };
    }

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const errorMessage = 'Token inválido ou expirado.';

    let userId: string | null = null;
    let userRole: 'student' | 'instructor' | null = null;

    const student = await this.prisma.student.findFirst({
      where: {
        passwordResetToken: dto.token.trim(),
        passwordResetExpires: { gt: new Date() },
      },
    });
    if (student) {
      userId = student.id;
      userRole = 'student';
    } else {
      const instructor = await this.prisma.instructor.findFirst({
        where: {
          passwordResetToken: dto.token.trim(),
          passwordResetExpires: { gt: new Date() },
        },
      });
      if (instructor) {
        userId = instructor.id;
        userRole = 'instructor';
      }
    }

    if (!userId || !userRole) {
      throw new BadRequestException(errorMessage);
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    if (userRole === 'student') {
      await this.prisma.student.update({
        where: { id: userId },
        data: { password: hashedPassword, passwordResetToken: null, passwordResetExpires: null },
      });
    } else {
      await this.prisma.instructor.update({
        where: { id: userId },
        data: { password: hashedPassword, passwordResetToken: null, passwordResetExpires: null },
      });
    }

    return { message: 'Senha redefinida com sucesso.' };
  }
}
