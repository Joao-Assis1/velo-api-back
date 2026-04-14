import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/student')
  loginStudent(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto, 'student');
  }

  @Post('login/instructor')
  loginInstructor(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto, 'instructor');
  }

  @Post('register/student')
  registerStudent(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto, 'student');
  }

  @Post('register/instructor')
  registerInstructor(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto, 'instructor');
  }
}
