import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TestModeService } from './test-mode.service';

@Injectable()
export class TestModeGuard implements CanActivate {
  constructor(private readonly testMode: TestModeService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!this.testMode.isEnabled(req)) {
      throw new ForbiddenException('Test mode is not enabled');
    }
    return true;
  }
}
