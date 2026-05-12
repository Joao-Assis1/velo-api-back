import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AsaasService } from '../payments/asaas.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Student, Instructor } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly asaasService: AsaasService,
  ) {}

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

    // Remove password before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return {
      access_token,
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
            cpf: registerDto.cpf,
            profilePicture: registerDto.profilePicture,
            ladvUploaded: registerDto.ladvUploaded,
            birthDate: registerDto.birthDate,
            motherName: registerDto.motherName,
            ufDomicile: registerDto.ufDomicile,
            intendedCategory: registerDto.intendedCategory,
          },
          include: { paymentMethods: true },
        });
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
      }
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new BadRequestException('E-mail já está em uso.');
      }
      throw e;
    }

    if (role === 'student') {
      try {
        const customer = await this.asaasService.createCustomer({
          name: user.name,
          email: user.email,
          cpfCnpj: (user as Student).cpf ?? undefined,
          phone: (user as Student).phone ?? undefined,
        });
        await this.prisma.student.update({
          where: { id: user.id },
          data: { asaasCustomerId: customer.id },
        });
      } catch (err) {
        this.logger.error(`Failed to create ASAAS customer for student ${user.id}: ${err}`);
      }
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; token?: string }> {
    const message = 'Se esse e-mail estiver cadastrado, você receberá um link em breve.';

    let userId: string | null = null;
    let userRole: 'student' | 'instructor' | null = null;

    const student = await this.prisma.student.findUnique({ where: { email: dto.email } });
    if (student) {
      userId = student.id;
      userRole = 'student';
    } else {
      const instructor = await this.prisma.instructor.findUnique({ where: { email: dto.email } });
      if (instructor) {
        userId = instructor.id;
        userRole = 'instructor';
      }
    }

    if (!userId || !userRole) {
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

    return {
      message,
      ...(process.env.NODE_ENV !== 'production' && { token }),
    };
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
