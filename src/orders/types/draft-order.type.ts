import { OrderStatus, PaymentType } from "@prisma/client";

export interface IDraftOrderParams {
  company_id: string;
  booking_id: string;
  subtotal: number;
  total: number;
  discount: number;
  comment?: string;
}

export interface IBookingWithOrder {
  order: {
    id: string;
    publicCode: number;
    tag: string | null;
    status: OrderStatus;
    subtotal: number;
    total: number;
    discount: number | null;
    paymentMethod: PaymentType | null;
    paidAt: Date | null;
    comment: string | null;
    isDeposit: boolean;
    companyId: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  services: {
    id: string;
    createdAt: Date;
    bookingId: string;
    unitPrice: number;
    duration: number;
    startTime: Date;
    endTime: Date;
    count: number;
    serviceId: string;
    employeeId: string;
  }[];
}
