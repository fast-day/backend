import { Module } from "@nestjs/common";
import { CustomerDocumentsService } from "./customer_documents.service";
import { CustomerDocumentsController } from "./customer_documents.controller";

@Module({
  controllers: [CustomerDocumentsController],
  providers: [CustomerDocumentsService],
})
export class CustomerDocumentsModule {}
