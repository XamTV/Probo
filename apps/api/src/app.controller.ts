import { Controller, Get } from '@nestjs/common';
import { AppService, HealthStatus } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Liveness probe, consumed by the Docker healthcheck and by production. */
  @Get('health')
  health(): Promise<HealthStatus> {
    return this.appService.health();
  }
}
