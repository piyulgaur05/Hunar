import { Module } from '@nestjs/common';
import { AuthService } from './modules/auth/auth.service';
import { AuthController } from './modules/auth/auth.controller';
import { CatalogService } from './modules/catalog/catalog.service';
import { CatalogController } from './modules/catalog/catalog.controller';
import { CartService } from './modules/cart/cart.service';
import { CartController } from './modules/cart/cart.controller';
import { OrderService } from './modules/orders/order.service';
import { OrderController } from './modules/orders/order.controller';
import { AdminService } from './modules/admin/admin.service';
import { AdminController } from './modules/admin/admin.controller';
import { CustomerController } from './modules/customers/customer.controller';
import { MediaController } from './modules/media/media.controller';
import { JobsService } from './modules/jobs/jobs.service';
@Module({
  controllers: [
    AuthController,
    CatalogController,
    CartController,
    OrderController,
    AdminController,
    CustomerController,
    MediaController,
  ],
  providers: [AuthService, CatalogService, CartService, OrderService, AdminService, JobsService],
})
export class AppModule {}
