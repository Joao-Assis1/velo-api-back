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
import { MedicalExamService } from './medical-exam.service';
import { ScheduleMedicalExamDto } from './dto/schedule-exam.dto';
import { UploadMedicalLaudoDto } from './dto/upload-laudo.dto';
import { MedicalExamDto } from './dto/medical-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildUploadStorage,
  MAX_UPLOAD_BYTES,
  uploadFileFilter,
} from '../../common/uploads/upload-storage';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('medical-exam')
@ApiBearerAuth()
@Controller('medical-exam')
@UseGuards(JwtAuthGuard)
export class MedicalExamController {
  constructor(private readonly service: MedicalExamService) {}

  @Get('me')
  @ApiOkResponse({ type: MedicalExamDto })
  async getMine(@Req() req: RequestWithUser): Promise<MedicalExamDto | null> {
    return this.service.getMine(req.user.id);
  }

  @Post('me/schedule')
  @ApiOkResponse({ type: MedicalExamDto })
  schedule(
    @Req() req: RequestWithUser,
    @Body() dto: ScheduleMedicalExamDto,
  ): Promise<MedicalExamDto> {
    return this.service.schedule(req.user.id, dto);
  }

  @Post('me/laudo')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: MedicalExamDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildUploadStorage('medical'),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  uploadLaudo(
    @Req() req: RequestWithUser,
    @Body() dto: UploadMedicalLaudoDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MedicalExamDto> {
    if (!file) {
      throw new BadRequestException('Laudo file is required');
    }
    return this.service.uploadLaudo(req.user.id, dto, file.path);
  }

  @Get('me/protocol/pdf')
  async downloadProtocol(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const buf = await this.service.buildProtocolPdfBuffer(req.user.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="protocolo-medico.pdf"',
    );
    res.end(buf);
  }
}
