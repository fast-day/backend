import { Module } from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CustomersController } from "./customers.controller";
import { RedisModule } from "src/redis/redis.module";
import { JwtModule } from "@nestjs/jwt";
import { CustomerTokenService } from "./token/token.service";
import { JwtCustomerStrategy } from "./strategies/jwt.strategy";
import { SmsModule } from "src/sms/sms.module";
import { CustomerChecksService } from "./customer-checks.service";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_CUSTOMER_SECRET,
      signOptions: { expiresIn: "30d" },
    }),
    RedisModule,
    SmsModule,
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomerTokenService,
    JwtCustomerStrategy,
    CustomerChecksService,
  ],
  exports: [CustomerChecksService],
})
export class CustomersModule {}
