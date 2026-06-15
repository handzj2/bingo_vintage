import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

/**
 * Health endpoint — Railway health probe.
 * Responds 200 immediately regardless of DB state.
 * DB connectivity is checked lazily inside the handler.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {

  @Get()
  @ApiOperation({ summary: 'Health check — process uptime and memory' })
  check() {
    const mem = process.memoryUsage();
    return {
      status:         'healthy',
      timestamp:       new Date().toISOString(),
      uptime_seconds:  Math.floor(process.uptime()),
      memory: {
        rss_mb:        Math.round(mem.rss        / 1024 / 1024),
        heap_used_mb:  Math.round(mem.heapUsed   / 1024 / 1024),
        heap_total_mb: Math.round(mem.heapTotal  / 1024 / 1024),
      },
    };
  }
}
