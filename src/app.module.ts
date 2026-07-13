import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { IS_DEV_ENV } from "./shared/utils/is-dev";
import { UserModule } from "./user/user.module";
import { ConfigurationService } from "./shared/configuration/configuration.service";
import { ConfigurationModule } from "./shared/configuration/configuration.module";
import { ConfigModule } from "@nestjs/config";
import { CompanyModule } from "./company/company.module";
import { LocationModule } from "./location/location.module";
import { AddressModule } from "./address/address.module";
import { EmployeeModule } from "./employee/employee.module";
import { RoleModule } from "./role/role.module";
import { AccessModule } from "./access/access.module";
import { ServicesModule } from "./services/services.module";
import { RedisModule } from "./redis/redis.module";
import { CustomersModule } from "./customers/customers.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { BookingsModule } from "./bookings/bookings.module";
import { MinioModule } from "./minio/minio.module";
import { OrdersModule } from "./orders/orders.module";
import { HealthModule } from "./health/health.module";
import { DirectoriesModule } from "./directories/directories.module";
import { CatalogModule } from "./catalog/catalog.module";
import { MailModule } from "./mail/mail.module";
import { SmsModule } from "./sms/sms.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { SettingsModule } from "./settings/settings.module";
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: !IS_DEV_ENV,
      isGlobal: true,
      envFilePath: ".env",
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    ConfigurationModule,
    CompanyModule,
    LocationModule,
    AddressModule,
    EmployeeModule,
    RoleModule,
    AccessModule,
    ServicesModule,
    RedisModule,
    CustomersModule,
    ScheduleModule,
    BookingsModule,
    MinioModule,
    OrdersModule,
    HealthModule,
    DirectoriesModule,
    CatalogModule,
    MailModule,
    SmsModule,
    DashboardModule,
    SettingsModule,
    OnboardingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private readonly _configurationService: ConfigurationService) {}
}
