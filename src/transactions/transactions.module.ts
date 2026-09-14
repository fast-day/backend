import { Module } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { TransactionsController } from "./transactions.controller";
import { TransactionCategoriesController } from "./category/transaction-categories.controller";
import { TransactionCategoriesService } from "./category/transaction-categories.service";

@Module({
  controllers: [TransactionsController, TransactionCategoriesController],
  providers: [TransactionsService, TransactionCategoriesService],
})
export class TransactionsModule {}
