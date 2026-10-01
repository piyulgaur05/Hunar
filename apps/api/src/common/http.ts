import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ZodError, ZodType } from 'zod';
import { Prisma } from '@mitti/database';
import type { Request } from 'express';
import pino from 'pino';
export const logger = pino({ redact: ['req.headers.cookie', 'password', 'token', 'authorization'] });
export type Principal = {
  id: string;
  email: string;
  name: string;
  verifiedAt: Date | null;
  permissions: string[];
};
export type RequestContext = Request & { user?: Principal; requestId: string };
export const Require = (permission = 'authenticated') => SetMetadata('permission', permission);
export const parse = <T>(schema: ZodType<T>, input: unknown) => schema.parse(input);
export const ok = <T>(data: T, meta?: unknown) => ({ data, meta: meta || {}, error: null });
@Injectable()
export class PermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const permission = new Reflector().getAllAndOverride<string>('permission', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) return true;
    const user = context.switchToHttp().getRequest<RequestContext>().user;
    if (!user) throw new UnauthorizedException('Sign in to continue');
    if (
      permission !== 'authenticated' &&
      !user.permissions.includes('*') &&
      !user.permissions.includes(permission)
    )
      throw new ForbiddenException('You do not have permission for this action');
    return true;
  }
}
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestContext>();
    let status = 500,
      code = 'INTERNAL_ERROR',
      message = 'Something went wrong. Please try again.';
    if (error instanceof ZodError) {
      status = 422;
      code = 'VALIDATION_ERROR';
      message = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      message = error.message;
      code = String(status);
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        status = 409;
        code = 'CONFLICT';
        message = 'This record already exists';
      } else if (error.code === 'P2025') {
        status = 404;
        code = 'NOT_FOUND';
        message = 'Record not found';
      } else if (error.code === 'P2034') {
        status = 409;
        code = 'RETRY_TRANSACTION';
        message = 'Another request changed this item. Please try again.';
      }
    }
    if (status >= 500) logger.error({ err: error, requestId: req.requestId }, 'Request failed');
    ctx
      .getResponse()
      .status(status)
      .json({ data: null, error: { code, message }, meta: { requestId: req.requestId } });
  }
}
