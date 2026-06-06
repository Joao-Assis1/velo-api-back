import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let message = 'File upload error';
    if (exception.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Maximum size is 10 MB.';
    } else if (exception.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected field: ${exception.field}`;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: new Date().toISOString(),
    });
  }
}
