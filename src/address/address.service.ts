import { Injectable } from "@nestjs/common";
import { CreateAddressDto } from "./dto/create.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class AddressService {
  async create(
    t: Prisma.TransactionClient,
    dto: CreateAddressDto,
    locationId: string,
  ) {
    const address = await t.address.create({
      data: {
        locationId,
        street: dto.street,
        house: dto.house,
        city: dto.city,
        post_code: dto.post_code,
        country: dto.country,
        region: dto.region,
        timezone: dto.timezone,
        timezoneoffset: dto.timezone_offset,
        positionLat: dto.lat,
        positionLng: dto.lng,
      },
      select: {
        timezone: true,
        timezoneoffset: true,
        street: true,
        region: true,
        country: true,
        city: true,
        house: true,
        positionLat: true,
        positionLng: true,
        post_code: true,
      },
    });

    return {
      full_address:
        [
          address.country,
          address.region,
          address.city,
          address.street,
          address.house,
        ]
          .filter(Boolean)
          .join(", ") || null,
      street: address.street,
      house: address.house,
      city: address.city,
      region: address.region,
      country: address.country,
      post_code: address.post_code,
      timezone: address.timezone,
      timezone_offset: address.timezoneoffset,
      map: {
        lat: address.positionLat,
        lng: address.positionLng,
      },
    };
  }
}
