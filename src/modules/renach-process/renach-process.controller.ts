import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
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
import { RenachProcessService } from './renach-process.service';
import { ScheduleRenachDto } from './dto/schedule-renach.dto';
import { CompleteRenachDto } from './dto/complete-renach.dto';
import { RenachProcessDto } from './dto/renach-process.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildUploadStorage,
  MAX_UPLOAD_BYTES,
  uploadFileFilter,
} from '../../common/uploads/upload-storage';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('renach-process')
@ApiBearerAuth()
@Controller('renach')
@UseGuards(JwtAuthGuard)
export class RenachProcessController {
  constructor(private readonly service: RenachProcessService) {}

  @Get('guide')
  @ApiOkResponse()
  guide(@Query('uf') uf: string) {
    if (!uf) {
      throw new BadRequestException('Query param "uf" is required');
    }
    return this.service.getGuide(uf);
  }

  @Get('me')
  @ApiOkResponse({ type: RenachProcessDto })
  getMine(@Req() req: RequestWithUser): Promise<RenachProcessDto> {
    return this.service.getMine(req.user.id);
  }

  @Post('me/schedule')
  @ApiOkResponse({ type: RenachProcessDto })
  schedule(
    @Req() req: RequestWithUser,
    @Body() dto: ScheduleRenachDto,
  ): Promise<RenachProcessDto> {
    return this.service.schedule(req.user.id, dto);
  }

  @Post('me/done')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOkResponse({ type: RenachProcessDto })
  @UseInterceptors(
    FileInterceptor('proofFile', {
      storage: buildUploadStorage('renach'),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  complete(
    @Req() req: RequestWithUser,
    @Body() dto: CompleteRenachDto,
    @UploadedFile() proofFile?: Express.Multer.File,
  ): Promise<RenachProcessDto> {
    return this.service.complete(req.user.id, dto, proofFile?.path);
  }
}
