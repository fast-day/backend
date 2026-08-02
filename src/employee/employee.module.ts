import { Module } from "@nestjs/common";
import { EmployeeService } from "./employee.service";
import { EmployeeController } from "./employee.controller";
import { UserModule } from "src/user/user.module";
import { LocationModule } from "src/location/location.module";
import { JwtModule } from "@nestjs/jwt";
import { AuthModule } from "src/auth/auth.module";
import { RoleModule } from "src/role/role.module";
import { MailModule } from "src/mail/mail.module";
import { SettingsModule } from "src/settings/settings.module";
import { ScheduleModule } from "src/schedule/schedule.module";

@Module({
  imports: [
    UserModule,
    LocationModule,
    AuthModule,
    RoleModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: "7d" },
    }),
    MailModule,
    SettingsModule,
    ScheduleModule,
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
