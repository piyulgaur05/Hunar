import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, SmtpEmailProvider, S3StorageProvider } from '@mitti/integrations';
import { db } from '@mitti/database';
import sharp from 'sharp';
import { logger } from '../../common/http';
import { OrderService } from '../orders/order.service';
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private worker?: Worker;
  private queue?: Queue;
  private running = false;
  constructor(@Inject(OrderService) private readonly orders: OrderService) {}
  async onModuleInit() {
    const url = new URL(process.env.REDIS_URL || 'redis://localhost:6386');
    const connection = { host: url.hostname, port: Number(url.port), password: url.password || undefined };
    this.queue = new Queue('commerce', {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });
    const email = new SmtpEmailProvider(),
      storage = new S3StorageProvider();
    this.worker = new Worker(
      'commerce',
      async (job) => {
        if (job.name === 'email') await email.send(job.data.to, job.data.subject, job.data.text);
        if (job.name === 'media') {
          const source = await storage.get(job.data.sourceKey);
          const variants: Record<string, string> = {};
          for (const [name, width] of [
            ['thumbnail', 180],
            ['small', 400],
            ['medium', 800],
          ] as const) {
            const bytes = await sharp(source)
              .resize(width, width, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();
            variants[name] = await storage.put(
              `public/${job.data.assetId}/${name}.webp`,
              bytes,
              'image/webp',
            );
          }
          await db.mediaAsset.update({ where: { id: job.data.assetId }, data: { variants } });
        }
      },
      { connection, concurrency: 3 },
    );
    this.worker.on('failed', (job, error) =>
      logger.error({ jobId: job?.id, error: error.message }, 'Background job failed'),
    );
    this.timer = setInterval(() => void this.tick(), 5000);
    this.timer.unref();
  }
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const events = await db.outboxEvent.findMany({
        where: { processedAt: null },
        take: 50,
        orderBy: { createdAt: 'asc' },
      });
      for (const event of events) {
        await this.queue!.add(event.type, event.payload, { jobId: event.id });
        await db.outboxEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
      }
      await this.orders.expire();
      await db.product.updateMany({
        where: { status: 'SCHEDULED', publishedAt: { lte: new Date() }, deletedAt: null },
        data: { status: 'PUBLISHED' },
      });
    } catch (error) {
      logger.error({ err: error }, 'Outbox processing failed');
    } finally {
      this.running = false;
    }
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close();
    await this.queue?.close();
  }
}
