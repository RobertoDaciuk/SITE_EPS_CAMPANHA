-- AlterTable
ALTER TABLE "relatorios_financeiros" ADD COLUMN     "numeroLote" TEXT,
ADD COLUMN     "processadoPorId" TEXT;

-- CreateIndex
CREATE INDEX "relatorios_financeiros_numeroLote_idx" ON "relatorios_financeiros"("numeroLote");

-- CreateIndex
CREATE INDEX "relatorios_financeiros_processadoPorId_idx" ON "relatorios_financeiros"("processadoPorId");

-- AddForeignKey
ALTER TABLE "relatorios_financeiros" ADD CONSTRAINT "relatorios_financeiros_processadoPorId_fkey" FOREIGN KEY ("processadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
