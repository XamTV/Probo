import { Controller, Get } from '@nestjs/common';
import { AppService, EtatSante } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Sonde de disponibilité, consommée par le healthcheck Docker et la prod. */
  @Get('sante')
  sante(): Promise<EtatSante> {
    return this.appService.sante();
  }
}
