import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/student')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  loginStudent(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto, 'student');
  }

  @Post('login/instructor')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  loginInstructor(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto, 'instructor');
  }

  @Post('register/student')
  registerStudent(@Body() registerDto: RegisterStudentDto) {
    return this.authService.register(registerDto, 'student');
  }

  @Post('register/instructor')
  registerInstructor(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto, 'instructor');
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
