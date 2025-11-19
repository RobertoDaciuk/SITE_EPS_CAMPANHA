-- DropIndex
DROP INDEX "opticas_codigoOtica_idx";

-- AlterTable
ALTER TABLE "envios_vendas" ADD COLUMN     "dataVenda" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "formatoDataPlanilha" TEXT DEFAULT 'DD/MM/YYYY';

-- CreateTable
CREATE TABLE "produtos_requisitos" (
    "id" TEXT NOT NULL,
    "requisitoId" TEXT NOT NULL,
    "codigoRef" TEXT NOT NULL,
    "pontosReais" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produtos_requisitos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "produtos_requisitos_requisitoId_idx" ON "produtos_requisitos"("requisitoId");

-- CreateIndex
CREATE INDEX "produtos_requisitos_codigoRef_idx" ON "produtos_requisitos"("codigoRef");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_requisitos_requisitoId_codigoRef_key" ON "produtos_requisitos"("requisitoId", "codigoRef");

-- RenameForeignKey
ALTER TABLE "auditoria_financeira" RENAME CONSTRAINT "fk_auditoria_admin" TO "auditoria_financeira_adminId_fkey";

-- AddForeignKey
ALTER TABLE "produtos_requisitos" ADD CONSTRAINT "produtos_requisitos_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "requisitos_cartelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
