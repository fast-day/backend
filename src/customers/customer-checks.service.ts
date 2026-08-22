import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { normalizePhone } from "src/shared/utils/phone";

@Injectable()
export class CustomerChecksService {
  constructor(private readonly prisma: PrismaService) {}

  //                                            ### NOTE ###
  // В КОМПАНИИ МОЖНО СОЗДАТЬ ПОЛЬЗОВАТЕЛЯ И ЗАПИСАТЬ ЕГО В КОМПАНИЮ ДАЖЕ КОГДА ЕГО НЕ СУЩЕСТВУЕТ В CUSTOMERS
  // ПОКА ТЕСТОВЫЙ ВАРИАНТ КОТОРЫЙ ДОБАВЛЯЕТ СУЩЕСТВУЮЩЕГО CUSTOMER В КОМПАНИЮ

  /** 
    СМОТРИ, ЗНАЧИТ МЫ БЕРЕМ В БОДИ ПРОКИДЫВАЕМ CUSTOMER_PHONE И ДРУГИЕ ПОЛЯ КОТОРЫЕ НЕОБХОДИМЫ ДЛЯ СОЗДАНИЯ КЛИЕНТА В КОМПАНИИ
    
    ТАК... И ЗАТЕМ МЫ ДОЛЖНЫ ПРОДЕЛАТЬ РАБОТУ НАД ПРОВЕРКОЙ СУЩЕСТВУЕТ ЛИ ТАКОЙ КЛИЕНТ В СИСТЕМЕ - ВО ВСЕЙ ИНФРАСТРУКТУРЕ 
    ЕСЛИ КЛИЕНТА НЕ СУЩЕСТВУЕТ, ТО СОЗДАЕМ ЕГО В CUSTOMERS И СОЗДАЕМ CUSTOMER ACCOUNT ПРОКИНУВ ТУДА ТОЛЬКО НОМЕР ТЕЛЕФОНА
    ЕСЛИ СУЩЕСТВУЕТ, ТО ПРОСТО СОЗДАЕМ CUSTOMER COMPANY

    И ЭТО НАМ ДАСТ ВОЗМОЖНОСТЬ ЗАПИСЫВАТЬ НЕАВТОРИЗОВАННОГО КЛИЕНТА НА УСЛУГИ КОМПАНИИ, ЧТО В ДАЛЬНЕЙШЕМ
    КОГДА КЛИЕНТ ЗАЙДЕТ В АККАУНТ У НЕГО БУДУТ ЕГО ЗАПИСИ И ИСТОРИЯ

    ** ПОСЛЕ КАК КЛИЕНТ ЗАХОЧЕ ПОСМОТРЕТЬ СВОИ ЗАПИСИ ИЛИ ЗАПИСАТЬ САМОСТОЯТЕЛЬНО, ВОЙДЯ В АККАУНТ ВСЯ ИСТОРИЯ ЗАКАЗОВ БУДЕТ У НЕГО НА РУКАХ
  **/
  async checkExistCustomer(
    phone: string,
    firstName: string,
    lastName?: string,
    email?: string,
  ): Promise<string> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { phone },
        select: { id: true },
      });

      if (customer) {
        return customer.id;
      }

      const createCustomer = await this.prisma.$transaction(async (t) => {
        const customer = await t.customer.create({
          data: {
            phone,
            email,
            firstName,
            lastName,
            phoneNormalized: normalizePhone(phone),
          },
          select: { id: true },
        });
        await t.customerAccount.create({
          data: {
            phone: phone,
            customerId: customer.id,
          },
        });

        return customer.id;
      });

      return createCustomer;
    } catch (err: any) {
      if (err.code === "P2002") {
        const customer = await this.prisma.customer.findUnique({
          where: { phone },
          select: { id: true },
        });

        return customer!.id;
      }
      throw err;
    }
  }
}
