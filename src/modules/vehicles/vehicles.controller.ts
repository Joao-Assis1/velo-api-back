import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildUploadStorage,
  MAX_UPLOAD_BYTES,
  uploadFileFilter,
} from '../../common/uploads/upload-storage';

interface RequestWithUser {
  user: { userId: string };
}

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Patch('instructor/:instructorId')
  upsertByInstructor(
    @Param('instructorId') instructorId: string,
    @Body() vehicleData: Partial<CreateVehicleDto>,
  ) {
    return this.vehiclesService.upsertByInstructor(instructorId, vehicleData);
  }

  @Patch(':id/photo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildUploadStorage('vehicles'),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  updatePhoto(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.vehiclesService.updatePhoto(id, req.user.userId, file.path);
  }

  @Get()
  findAll(@Query('instructorId') instructorId?: string) {
    return this.vehiclesService.findAll(instructorId);
  }
}
