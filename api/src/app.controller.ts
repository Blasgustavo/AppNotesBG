import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService, HealthStatus } from './app.service';
import { Public } from './core/firebase';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check del sistema' })
  @ApiResponse({ status: 200, description: 'Estado de salud de la aplicación' })
  async getHealth(): Promise<HealthStatus> {
    return this.appService.getHealth();
  }
}
