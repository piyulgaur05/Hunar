import { PrismaClient } from '@prisma/client';
export { Prisma, ProductStatus, OrderStatus } from '@prisma/client';
export const db = new PrismaClient();
export type Database = typeof db;
