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
import { LadvProcessService } from './ladv-process.service';
import { ManualLadvDto } from './dto/manual-ladv.dto';
import { LadvStatusDto } from './dto/ladv-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildUploadStorage,
  MAX_UPLOAD_BYTES,
  uploadFileFilter,
} from '../../common/uploads/upload-storage';
import { TestModeService } from '../../common/test-mode/test-mode.service';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@ApiTags('ladv-process')
@ApiBearerAuth()
@Controller('ladv')
@UseGuards(JwtAuthGuard)
export class LadvProcessController {
  constructor(
    private readonly service: LadvProcessService,
    private readonly testMode: TestModeService,
  ) {}

  @Get('guide')
  @ApiOkResponse()
  guide(@Query('uf') uf: string) {
    if (!uf) throw new BadRequestException('Query param "uf" is required');
    return this.service.getGuide(uf);
  }

  @Get('me')
  @ApiOkResponse({ type: LadvStatusDto })
  getMine(@Req() req: RequestWithUser): Promise<LadvStatusDto> {
    return this.service.getMine(req.user.userId);
  }

  @Post('me/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: LadvStatusDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildUploadStorage('ladv'),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  upload(
    @Req() req: RequestWithUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<LadvStatusDto> {
    if (this.testMode.isEnabled(req)) {
      return this.service.uploadTestMode(req.user.userId);
    }
    if (!file) throw new BadRequestException('LADV file is required');
    return this.service.uploadFromFile(req.user.userId, file.path);
  }

  @Post('me/manual')
  @ApiOkResponse({ type: LadvStatusDto })
  manual(
    @Req() req: RequestWithUser,
    @Body() dto: ManualLadvDto,
  ): Promise<LadvStatusDto> {
    return this.service.saveManual(req.user.userId, dto);
  }
}
