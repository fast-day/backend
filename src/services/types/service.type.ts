import { MarkEnum, ServiceType } from "@prisma/client";

export type ServiceDate = {
  days: string[];
  time_start: string;
  time_end: string;
};

export type ServicePrices = {
  price: number | null;
  cost_price: number | null;
};

export type ServiceDiscount = {
  date_type: string | null;
  days: string[] | null;
  price: number | null;
  time_start: string | null;
  time_end: string | null;
};

export type ServiceUsers = {
  id: string;
  name: string;
};

export type ServiceLocations = {
  id: string;
  name: string;
};

export interface IService {
  id: string;
  name: string;
  duration: number;
  category: string | null;
  mark: MarkEnum;
  public_name: string | null;
  price: number | null;
  prices: ServicePrices;
  date: ServiceDate;
  discount: ServiceDiscount | null;
  users: ServiceUsers[];
  locations: ServiceLocations[];
}

export interface IServices {
  id: string;
  name: string;
  duration: number;
  category: string | null;
  public_name: string | null;
  avatar: string | null;
  price: number | null;
  mark: MarkEnum;
  type: ServiceType;
  prices: ServicePrices;
  // date: ServiceDate;
  // discount: ServiceDiscount | null;
  users_length: number;
  locations_length: number;
}
