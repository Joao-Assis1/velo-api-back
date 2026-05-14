import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JourneyService } from './journey.service';
import { JourneyStateDto } from './dto/journey-state.dto';
import { TimelineStepDto } from './dto/timeline-step.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser {
  user: { id: string; role: string };
}

@ApiTags('journey')
@ApiBearerAuth()
@Controller('journey')
@UseGuards(JwtAuthGuard)
export class JourneyController {
  constructor(private readonly journey: JourneyService) {}

  @Get('me')
  @ApiOkResponse({ type: JourneyStateDto })
  async myState(@Req() req: RequestWithUser): Promise<JourneyStateDto> {
    return this.journey.computeStage(req.user.id);
  }

  @Get('me/timeline')
  @ApiOkResponse({ type: [TimelineStepDto] })
  async myTimeline(@Req() req: RequestWithUser): Promise<TimelineStepDto[]> {
    return this.journey.getTimeline(req.user.id);
  }

  @Post('me/declare-ready-for-exam')
  @ApiOkResponse({ type: JourneyStateDto })
  async declareReady(@Req() req: RequestWithUser): Promise<JourneyStateDto> {
    return this.journey.declareReadyForExam(req.user.id);
  }
}
