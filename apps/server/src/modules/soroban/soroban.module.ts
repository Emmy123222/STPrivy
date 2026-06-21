import { Module } from "@nestjs/common";
import { SorobanService } from "./soroban.service";
import { SorobanEventIndexer } from "./soroban-event-indexer.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [SorobanService, SorobanEventIndexer],
  exports: [SorobanService, SorobanEventIndexer],
})
export class SorobanModule {}
