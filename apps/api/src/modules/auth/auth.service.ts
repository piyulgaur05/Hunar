import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { db } from '@mitti/database';
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Response } from 'express';
import type { Principal, RequestContext } from '../../common/http';
const derive = promisify(scrypt);
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${((await derive(password, salt, 64)) as Buffer).toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(':');
  const computed = (await derive(password, salt, 64)) as Buffer;
  return key.length === 128 && timingSafeEqual(Buffer.from(key, 'hex'), computed);
}
@Injectable()
export class AuthService {
  private cookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 86400000,
  };
  async identity(token?: string): Promise<Principal | undefined> {
    if (!token) return;
    const session = await db.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: {
        user: {
          include: {
            roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
          },
        },
      },
    });
    if (!session || session.expiresAt < new Date() || session.user.disabledAt) return;
    const user = session.user;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      verifiedAt: user.verifiedAt,
      permissions: [...new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key)))],
    };
  }
  async session(userId: string, req: RequestContext, res: Response) {
    const token = randomBytes(32).toString('hex');
    await db.session.create({
      data: {
        userId,
        tokenHash: tokenHash(token),
        expiresAt: new Date(Date.now() + this.cookie.maxAge),
        ip: req.ip,
        userAgent: req.headers['user-agent']?.slice(0, 500),
      },
    });
    res.cookie('mitti_session', token, this.cookie);
    return this.identity(token);
  }
  async login(email: string, password: string, req: RequestContext, res: Response) {
    const user = await db.user.findUnique({ where: { email } });
    const fallback = '00112233445566778899aabbccddeeff:' + '00'.repeat(64);
    const valid = await verifyPassword(password, user?.passwordHash || fallback);
    if (!user || !valid || user.disabledAt) {
      await db.auditLog.create({ data: { action: 'LOGIN_FAILED', resource: 'auth', ip: req.ip } });
      throw new UnauthorizedException('Email or password is incorrect');
    }
    await db.auditLog.create({
      data: { actorId: user.id, action: 'LOGIN_SUCCESS', resource: 'auth', ip: req.ip },
    });
    return this.session(user.id, req, res);
  }
  async register(
    input: { email: string; name: string; password: string },
    req: RequestContext,
    res: Response,
  ) {
    if (await db.user.findUnique({ where: { email: input.email } }))
      throw new ConflictException('An account already exists for this email');
    const user = await db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        profile: { create: {} },
      },
    });
    await this.issueToken(user.id, user.email, 'verify');
    return this.session(user.id, req, res);
  }
  async logout(req: RequestContext, res: Response) {
    if (req.cookies.mitti_session)
      await db.session.deleteMany({ where: { tokenHash: tokenHash(req.cookies.mitti_session) } });
    res.clearCookie('mitti_session', this.cookie);
    return { signedOut: true };
  }
  async refresh(req: RequestContext, res: Response) {
    const current = await db.session.deleteMany({
      where: { tokenHash: tokenHash(req.cookies.mitti_session || '') },
    });
    if (!current.count) throw new UnauthorizedException();
    return this.session(req.user!.id, req, res);
  }
  async issueToken(userId: string, email: string, purpose: string) {
    const token = randomBytes(32).toString('hex');
    await db.$transaction(async (tx) => {
      await tx.authToken.deleteMany({ where: { userId, purpose } });
      await tx.authToken.create({
        data: { userId, purpose, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 3600000) },
      });
      await tx.outboxEvent.create({
        data: {
          type: 'email',
          payload: {
            to: email,
            subject: purpose === 'reset' ? 'Reset your password' : 'Welcome to Hunaré',
            text: `Open this link to ${purpose === 'reset' ? 'reset your password' : 'verify your email'}: ${process.env.STOREFRONT_URL}/account?mode=${purpose}&token=${token}`,
          },
        },
      });
    });
    return { message: 'Check your email for the next step.' };
  }
  async forgot(email: string) {
    const user = await db.user.findUnique({ where: { email } });
    if (user) await this.issueToken(user.id, email, 'reset');
    return { message: 'If an account exists, a reset link has been sent.' };
  }
  async consume(token: string, purpose: string, password?: string) {
    const hash = password ? await hashPassword(password) : undefined;
    await db.$transaction(async (tx) => {
      const record = await tx.authToken.findUnique({ where: { tokenHash: tokenHash(token) } });
      if (!record || record.purpose !== purpose || record.expiresAt < new Date())
        throw new UnauthorizedException('This link is invalid or expired');
      await tx.authToken.delete({ where: { id: record.id } });
      await tx.user.update({
        where: { id: record.userId },
        data: purpose === 'verify' ? { verifiedAt: new Date() } : { passwordHash: hash },
      });
      if (purpose === 'reset') await tx.session.deleteMany({ where: { userId: record.userId } });
    });
    return {
      message: purpose === 'verify' ? 'Email verified.' : 'Password updated. Sign in with your new password.',
    };
  }
}
