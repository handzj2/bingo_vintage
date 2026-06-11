import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource }       from 'typeorm';

/**
 * PHASE 11 — Health endpoint
 * GET /api/health — checks DB connectivity + returns uptime/memory.
 * Public endpoint (no JWT) so load-balancers and Railway health probes work.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Health check — DB, memory, uptime' })
  async check() {
    let dbStatus = 'ok';
    let dbLatencyMs = 0;

    try {
      const t0 = Date.now();
      await this.ds.query('SELECT 1');
      dbLatencyMs = Date.now() - t0;
    } catch {
      dbStatus = 'error';
    }

    const mem = process.memoryUsage();
    return {
      status:   dbStatus === 'ok' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      database: {
        status:     dbStatus,
        latency_ms: dbLatencyMs,
      },
      memory: {
        rss_mb:       Math.round(mem.rss        / 1024 / 1024),
        heap_used_mb: Math.round(mem.heapUsed   / 1024 / 1024),
        heap_total_mb:Math.round(mem.heapTotal  / 1024 / 1024),
      },
    };
  }
}
