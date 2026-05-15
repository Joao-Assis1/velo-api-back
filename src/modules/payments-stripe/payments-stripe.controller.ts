import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsStripeService } from './payments-stripe.service';
import { StripeConnectService } from './stripe-connect.service';
import { ChargeDto } from './dto/charge.dto';
import {
  AttachPaymentMethodDto,
  PaymentMethodResponseDto,
} from './dto/payment-method.dto';
import { SetupIntentResponseDto } from './dto/setup-intent-response.dto';
import {
  ConnectOnboardResponseDto,
  ConnectStatusDto,
} from './dto/connect-status.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser {
  user: { id: string; role?: string };
}

@ApiTags('payments-stripe')
@ApiBearerAuth()
@Controller('payments-stripe')
@UseGuards(JwtAuthGuard)
export class PaymentsStripeController {
  constructor(
    private readonly service: PaymentsStripeService,
    private readonly connect: StripeConnectService,
  ) {}

  @Post('setup-intent')
  @ApiOkResponse({ type: SetupIntentResponseDto })
  setupIntent(@Req() req: RequestWithUser) {
    return this.service.createSetupIntent(req.user.id);
  }

  @Post('payment-methods')
  @ApiOkResponse({ type: PaymentMethodResponseDto })
  attach(@Req() req: RequestWithUser, @Body() dto: AttachPaymentMethodDto) {
    return this.service.attachPaymentMethod(req.user.id, dto);
  }

  @Delete('payment-methods/:id')
  detach(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.service.detachPaymentMethod(req.user.id, id);
  }

  @Post('charge')
  charge(@Req() req: RequestWithUser, @Body() dto: ChargeDto) {
    return this.service.charge(req.user.id, dto);
  }

  @Get('me')
  getMyPayments(@Req() req: RequestWithUser) {
    return this.service.listMyPayments(req.user.id);
  }

  @Post('connect/onboard')
  @ApiOkResponse({ type: ConnectOnboardResponseDto })
  onboard(@Req() req: RequestWithUser) {
    return this.connect.startOnboarding(req.user.id);
  }

  @Get('connect/status')
  @ApiOkResponse({ type: ConnectStatusDto })
  connectStatus(@Req() req: RequestWithUser) {
    return this.connect.getStatus(req.user.id);
  }

  @Post('disputes/:lessonId/resolve')
  resolveDispute(
    @Req() req: RequestWithUser,
    @Param('lessonId') lessonId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admin can resolve disputes');
    }
    return this.service.resolveDispute(lessonId, dto);
  }
}
