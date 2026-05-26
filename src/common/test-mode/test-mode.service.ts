import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class TestModeService {
  constructor(private readonly config: ConfigService) {}

  isEnabled(req: Request): boolean {
    return (
      this.config.get<string>('ENABLE_TEST_MODE') === 'true' &&
      req.headers['x-test-mode'] === 'true'
    );
  }
}
