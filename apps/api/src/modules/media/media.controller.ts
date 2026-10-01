import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { db } from '@mitti/database';
import { S3StorageProvider } from '@mitti/integrations';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { ok, Require, RequestContext } from '../../common/http';
@Controller('media')
export class MediaController {
  private storage = new S3StorageProvider();
  @Get() @Require('media:create') async list() {
    return ok(await db.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }));
  }
  @Post()
  @Require('media:create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024, files: 1 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('alt') alt: string,
    @Req() req: RequestContext,
  ) {
    if (!file) throw new BadRequestException('Choose an image');
    let metadata;
    try {
      metadata = await sharp(file.buffer, { limitInputPixels: 40000000 }).metadata();
    } catch {
      throw new BadRequestException('The file is not a valid image');
    }
    if (!['jpeg', 'png', 'webp', 'avif'].includes(metadata.format || '') || (metadata.pages || 1) > 1)
      throw new BadRequestException('Use a single JPEG, PNG, WebP, or AVIF image');
    const id = randomUUID();
    const bytes = await sharp(file.buffer)
      .rotate()
      .resize(1800, 1800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    await this.storage.initialize();
    const key = `public/${id}/large.webp`;
    await this.storage.put(`originals/${id}`, file.buffer, `image/${metadata.format}`);
    const url = await this.storage.put(key, bytes, 'image/webp');
    const asset = await db.mediaAsset.create({
      data: { id, key, url, mimeType: 'image/webp', size: bytes.length, alt: (alt || '').slice(0, 200) },
    });
    await db.outboxEvent.create({ data: { type: 'media', payload: { assetId: id, sourceKey: key } } });
    await db.auditLog.create({
      data: { actorId: req.user!.id, action: 'MEDIA_UPLOADED', resource: 'media', resourceId: id },
    });
    return ok(asset);
  }
}
