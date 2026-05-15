import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TheoryExamOfficialService } from './theory-exam.service';
import { RecordTheoryExamDto } from './dto/record-theory-exam.dto';
import { OfficialTheoryExamDto } from './dto/theory-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildUploadStorage,
  MAX_UPLOAD_BYTES,
  uploadFileFilter,
} from '../../common/uploads/upload-storage';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('theory-exam')
@ApiBearerAuth()
@Controller('theory-exam')
@UseGuards(JwtAuthGuard)
export class TheoryExamOfficialController {
  constructor(private readonly service: TheoryExamOfficialService) {}

  @Get('me')
  @ApiOkResponse({ type: OfficialTheoryExamDto })
  async getMine(
    @Req() req: RequestWithUser,
  ): Promise<OfficialTheoryExamDto | null> {
    return this.service.getMine(req.user.id);
  }

  @Post('me')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOkResponse({ type: OfficialTheoryExamDto })
  @UseInterceptors(
    FileInterceptor('proofFile', {
      storage: buildUploadStorage('theory-exam'),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  record(
    @Req() req: RequestWithUser,
    @Body() dto: RecordTheoryExamDto,
    @UploadedFile() proofFile?: Express.Multer.File,
  ): Promise<OfficialTheoryExamDto> {
    return this.service.record(req.user.id, dto, proofFile?.path ?? null);
  }
}
