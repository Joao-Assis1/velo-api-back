import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto, role: 'student' | 'instructor') {
    let user;
    if (role === 'student') {
      user = await this.prisma.student.findUnique({ where: { email: loginDto.email } });
    } else {
      user = await this.prisma.instructor.findUnique({ where: { email: loginDto.email } });
    }

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.password) {
      // For existing users before authentication feature
      if (loginDto.password !== '123456') { // Fallback password for old users
        throw new UnauthorizedException('Credenciais inválidas');
      }
    } else {
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Credenciais inválidas');
      }
    }

    const payload = { sub: user.id, email: user.email, role };
    const access_token = await this.jwtService.signAsync(payload);

    // Remove password before returning
    const { password, ...userWithoutPassword } = user;

    return {
      access_token,
      user: userWithoutPassword,
    };
  }

  async register(registerDto: RegisterDto, role: 'student' | 'instructor') {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    let user;
    try {
      if (role === 'student') {
        user = await this.prisma.student.create({
          data: {
            email: registerDto.email,
            name: registerDto.name,
            password: hashedPassword,
          },
        });
      } else {
        user = await this.prisma.instructor.create({
          data: {
            email: registerDto.email,
            name: registerDto.name,
            password: hashedPassword,
          },
        });
      }
    } catch (e) {
      if (e.code === 'P2002') {
        throw new BadRequestException('E-mail já está em uso.');
      }
      throw e;
    }

    const payload = { sub: user.id, email: user.email, role };
    const access_token = await this.jwtService.signAsync(payload);

    const { password, ...userWithoutPassword } = user;

    return {
      access_token,
      user: userWithoutPassword,
    };
  }
}
