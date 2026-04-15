import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private paymentMethodsService: PaymentMethodsService) {}

  @Post()
  @HttpCode(201)
  async create(@Req() req: any, @Body() dto: CreatePaymentMethodDto) {
    // Garantir que o studentId do DTO seja o do usuário logado se for um aluno
    const userId = req.user.userId;
    return this.paymentMethodsService.create({ ...dto, studentId: userId });
  }

  @Get()
  @HttpCode(200)
  async findAll(@Req() req: any, @Query('studentId') studentId?: string) {
    // Se for um aluno, ele só pode ver os próprios cartões
    const userId = req.user.userId;
    const role = req.user.role;
    
    const targetId = role === 'student' ? userId : (studentId || userId);
    return this.paymentMethodsService.findAll(targetId);
  }

  @Get('student/:studentId')
  @HttpCode(200)
  async findByStudent(@Req() req: any, @Param('studentId') studentId: string) {
    const userId = req.user.userId;
    const role = req.user.role;
    
    const targetId = role === 'student' ? userId : studentId;
    return this.paymentMethodsService.findAll(targetId);
  }

  @Patch(':id/default')
  @HttpCode(200)
  async setDefault(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const userId = req.user.userId;
    return this.paymentMethodsService.setDefault(id, userId);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    await this.paymentMethodsService.delete(id, userId);
  }
}
