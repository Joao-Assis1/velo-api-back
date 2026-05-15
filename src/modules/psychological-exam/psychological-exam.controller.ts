import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PsychologicalExamService } from './psychological-exam.service';
import { SchedulePsychologicalExamDto } from './dto/schedule-exam.dto';
import { UploadPsychologicalLaudoDto } from './dto/upload-laudo.dto';
import { PsychologicalExamDto } from './dto/psychological-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildUploadStorage,
  MAX_UPLOAD_BYTES,
  uploadFileFilter,
} from '../../common/uploads/upload-storage';

interface RequestWithUser {
  user: { userId: string };
}

@ApiTags('psychological-exam')
@ApiBearerAuth()
@Controller('psychological-exam')
@UseGuards(JwtAuthGuard)
export class PsychologicalExamController {
  constructor(private readonly service: PsychologicalExamService) {}

  @Get('me')
  @ApiOkResponse({ type: PsychologicalExamDto })
  async getMine(
    @Req() req: RequestWithUser,
  ): Promise<PsychologicalExamDto | null> {
    return this.service.getMine(req.user.userId);
  }

  @Post('me/schedule')
  @ApiOkResponse({ type: PsychologicalExamDto })
  schedule(
    @Req() req: RequestWithUser,
    @Body() dto: SchedulePsychologicalExamDto,
  ): Promise<PsychologicalExamDto> {
    return this.service.schedule(req.user.userId, dto);
  }

  @Post('me/laudo')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: PsychologicalExamDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildUploadStorage('psychological'),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  uploadLaudo(
    @Req() req: RequestWithUser,
    @Body() dto: UploadPsychologicalLaudoDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PsychologicalExamDto> {
    if (!file) {
      throw new BadRequestException('Laudo file is required');
    }
    return this.service.uploadLaudo(req.user.userId, dto, file.path);
  }

  @Get('me/protocol/pdf')
  async downloadProtocol(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const buf = await this.service.buildProtocolPdfBuffer(req.user.userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="protocolo-psicologico.pdf"',
    );
    res.end(buf);
  }
}
