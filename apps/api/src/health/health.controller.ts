import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      uptimeSec: Math.floor(process.uptime()),
      service: 'asist-api',
      dbMode: process.env.ASIST_DB_MODE ?? 'on',
      queueMode: process.env.ASIST_QUEUE_MODE ?? 'off',
    };
  }
}
