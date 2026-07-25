import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard as PassportAuthGuard } from "@nestjs/passport";

@Injectable()
export class AuthGuard extends PassportAuthGuard("jwt_app") {
  constructor(private reflector: Reflector) {
    super();
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          title: "Сессия истекла",
          detail:
            "Срок вашей сессии истек. Пожалуйста, войдите в систему снова",
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return user;
  }
}
