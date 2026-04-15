import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Post('process')
  process(@Body() processPaymentDto: any) {
    return this.paymentsService.processPayment(processPaymentDto);
  }

  @Get()
  findAll(@Query('studentId') studentId?: string) {
    return this.paymentsService.findAll(studentId);
  }
}
