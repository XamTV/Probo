import { Controller, Get } from '@nestjs/common';
import { AppService, HealthStatus } from './app.service';
import { Public } from './auth/auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Liveness probe, consumed by the Docker healthcheck and by production. */
  @Public()
  @Get('health')
  health(): Promise<HealthStatus> {
    return this.appService.health();
  }
}
