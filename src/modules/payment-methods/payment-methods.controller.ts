import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TestModeGuard } from '../../common/test-mode/test-mode.guard';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private paymentMethodsService: PaymentMethodsService) {}

  @Get()
  @HttpCode(200)
  async findAll(
    @Req() req: RequestWithUser,
    @Query('studentId') studentId?: string,
  ) {
    const userId = req.user.userId;
    const role = req.user.role;
    const targetId = role === 'student' ? userId : studentId || userId;
    return this.paymentMethodsService.findAll(targetId);
  }

  @Get('student/:studentId')
  @HttpCode(200)
  async findByStudent(
    @Req() req: RequestWithUser,
    @Param('studentId') studentId: string,
  ) {
    const userId = req.user.userId;
    const role = req.user.role;
    const targetId = role === 'student' ? userId : studentId;
    return this.paymentMethodsService.findAll(targetId);
  }

  @Post('me/seed-test')
  @HttpCode(201)
  @UseGuards(TestModeGuard)
  async seedTest(@Req() req: RequestWithUser) {
    return this.paymentMethodsService.seedTest(req.user.userId);
  }

  @Patch(':id/default')
  @HttpCode(200)
  async setDefault(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.paymentMethodsService.setDefault(userId, id);
  }
}
