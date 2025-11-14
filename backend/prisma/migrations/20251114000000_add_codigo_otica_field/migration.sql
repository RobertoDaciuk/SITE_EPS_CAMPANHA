-- AlterTable
ALTER TABLE "opticas" ADD COLUMN "codigoOtica" TEXT;

-- CreateIndex (opcional - adicionar índice para busca rápida)
CREATE INDEX "opticas_codigoOtica_idx" ON "opticas"("codigoOtica");
