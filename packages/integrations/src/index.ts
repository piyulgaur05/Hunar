import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import nodemailer from 'nodemailer';
export interface PaymentProvider {
  readonly name: string;
  createPayment(input: {
    orderId: string;
    amount: number;
    currency: string;
  }): Promise<{ id: string; keyId?: string }>;
  verifyPayment(raw: Buffer, signature: string): boolean;
  capturePayment(id: string, amount: number): Promise<unknown>;
  refundPayment(id: string, amount: number, receipt: string): Promise<{ id: string }>;
}
export function verifySignature(raw: Buffer, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  constructor() {
    if (process.env.NODE_ENV === 'production') throw new Error('Mock payments are forbidden in production');
  }
  async createPayment(_input: { orderId: string; amount: number; currency: string }) {
    return { id: `mock_${randomUUID()}` };
  }
  verifyPayment() {
    return false;
  }
  async capturePayment(id: string) {
    return { id };
  }
  async refundPayment(_id: string, _amount: number, receipt: string) {
    return { id: `mock_refund_${receipt}` };
  }
}
export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';
  constructor(
    private readonly keyId: string,
    private readonly keySecret: string,
    private readonly webhookSecret: string,
  ) {}
  private async request(path: string, body: unknown) {
    const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Payment provider request failed');
    return response.json() as Promise<{ id: string }>;
  }
  async createPayment(input: { orderId: string; amount: number; currency: string }) {
    return {
      ...(await this.request('orders', {
        amount: input.amount,
        currency: input.currency,
        receipt: input.orderId,
        notes: { orderId: input.orderId },
      })),
      keyId: this.keyId,
    };
  }
  verifyPayment(raw: Buffer, signature: string) {
    return verifySignature(raw, signature, this.webhookSecret);
  }
  capturePayment(id: string, amount: number) {
    return this.request(`payments/${encodeURIComponent(id)}/capture`, { amount, currency: 'INR' });
  }
  refundPayment(id: string, amount: number, receipt: string) {
    return this.request(`payments/${encodeURIComponent(id)}/refund`, { amount, receipt });
  }
}
export interface EmailProvider {
  send(to: string, subject: string, text: string): Promise<void>;
}
export class SmtpEmailProvider implements EmailProvider {
  private transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 1026),
    secure: process.env.SMTP_SECURE === 'true',
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
      : {}),
  });
  async send(to: string, subject: string, text: string) {
    await this.transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
  }
}
export interface StorageProvider {
  put(key: string, bytes: Buffer, mimeType: string): Promise<string>;
}
export class S3StorageProvider implements StorageProvider {
  private bucket = process.env.S3_BUCKET || 'mitti-media';
  private client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
  });
  async initialize() {
    if (process.env.NODE_ENV === 'production') return;
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (!['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes((error as Error).name)) throw error;
    }
    await this.client.send(
      new PutBucketPolicyCommand({
        Bucket: this.bucket,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/public/*`],
            },
          ],
        }),
      }),
    );
  }
  async put(key: string, bytes: Buffer, mimeType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: mimeType,
        CacheControl: 'public,max-age=31536000,immutable',
      }),
    );
    return `${process.env.S3_PUBLIC_URL}/${key}`;
  }
  async get(key: string) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await result.Body!.transformToByteArray());
  }
}
export { Queue, Worker } from 'bullmq';
export { default as Redis } from 'ioredis';
export interface SearchProvider<T> {
  search(query: string, options: Record<string, unknown>): Promise<T>;
}
export interface AnalyticsProvider {
  track(type: string, metadata: Record<string, unknown>): Promise<void>;
}
export interface ShippingProvider {
  quote(subtotal: number, postalCode: string): Promise<{ amount: number; minDays: number; maxDays: number }>;
}
export class ManualShippingProvider implements ShippingProvider {
  async quote(subtotal: number, _postalCode: string) {
    return {
      amount:
        subtotal >= Number(process.env.SHIPPING_FREE_ABOVE_PAISE || 250000)
          ? 0
          : Number(process.env.SHIPPING_FLAT_PAISE || 9900),
      minDays: 5,
      maxDays: 8,
    };
  }
}
