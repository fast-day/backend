import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SendCodeDto } from "./dto/send-code.dto";
import { RedisService } from "src/redis/redis.service";
import { VerifyCodeDto } from "./dto/verify.dto";
import { CustomerJwtPayload } from "./types/jwt.payload";
import { CustomerTokenService } from "./token/token.service";
import { JwtService } from "@nestjs/jwt";
import { buildFileUrl } from "src/shared/utils/build-url";
import { normalizePhone } from "src/shared/utils/phone";

@Injectable()
export class CustomersAppService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenService: CustomerTokenService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}
  async firstByAccount(phone: string) {
    const customer = await this.prismaService.customerAccount.findUnique({
      where: { phone },
      select: { id: true, phone: true },
    });

    if (!customer)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Аккаунт не найден",
        },
        HttpStatus.NOT_FOUND,
      );

    return customer;
  }

  async sendCode(dto: SendCodeDto) {
    const { phone } = dto;

    const ttl = await this.redisService.ttl(`auth:code:${phone}`);
    if (ttl > 240) {
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          title: "Подождите",
          message: `Повторная отправка через ${ttl - 240} сек.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const account = await this.prismaService.customerAccount.findUnique({
      where: { phone },
    });

    if (!account) {
      const customer = await this.prismaService.customer.create({
        data: {
          phone,
          phoneNormalized: normalizePhone(phone),
          firstName: "Боб", // TEST
        },
      });

      await this.prismaService.customerAccount.create({
        data: { phone, customerId: customer.id },
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000);

    await this.redisService.setEx(`auth:code:${phone}`, 300, code.toString());

    // await this.smsService.sendSms(phone, `Ваш код ${code}`);

    return { success: true, code };
  }

  async verifyCode(dto: VerifyCodeDto, ipAddress: string) {
    const { phone, code } = dto;

    const storeCode = await this.redisService.get(`auth:code:${phone}`);

    const { id: customerId, phone: customerPhone } =
      await this.firstByAccount(phone);

    const isDevBypass = code === 111111;
    const isValidCode = Number(storeCode) === code;

    if (!isDevBypass && !isValidCode)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Неверный код",
          message: "Попробуйте еще раз",
        },
        HttpStatus.NOT_FOUND,
      );

    await this.prismaService.customerAccount.update({
      where: { id: customerId },
      data: { verified: true, lastLoginAt: new Date() },
    });
    await this.redisService.del(`auth:code:${phone}`);

    const payload = {
      sub: customerId,
      phone: customerPhone,
    } satisfies CustomerJwtPayload;

    const accessToken = this.jwtService.sign(payload, { expiresIn: "30d" });
    const refreshToken = await this.tokenService.createRefreshToken({
      customerId,
      ipAddress,
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async getMe(id: string) {
    const account = await this.prismaService.customerAccount.findUnique({
      where: { id },
      select: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            birthday: true,
            avatar: true,
          },
        },
      },
    });

    if (!account) throw new Error("Аккаунт не найден");

    const customer = {
      id: account.customer.id,
      avatar: buildFileUrl(account.customer.avatar),
      first_name: account.customer.firstName,
      last_name: account.customer.lastName,
      email: account.customer.email,
      phone: account.customer.phone,
      birthday: account.customer.birthday,
    };

    return customer;
  }
}
