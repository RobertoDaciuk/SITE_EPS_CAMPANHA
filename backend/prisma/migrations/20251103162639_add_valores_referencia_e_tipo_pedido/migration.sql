/*
  Warnings:

  - You are about to drop the column `pontosReaisPorCartela` on the `campanhas` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoPedido" AS ENUM ('OS_OP_EPS', 'OPTICLICK', 'EPSWEB', 'ENVELOPE_OTICA');

-- AlterTable
ALTER TABLE "campanhas" DROP COLUMN "pontosReaisPorCartela",
ADD COLUMN     "pontosReaisMaximo" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "regras" TEXT,
ADD COLUMN     "tipoPedido" "TipoPedido" NOT NULL DEFAULT 'OS_OP_EPS';

-- AlterTable
ALTER TABLE "envios_vendas" ADD COLUMN     "codigoReferenciaUsado" TEXT,
ADD COLUMN     "valorPontosReaisRecebido" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "valores_referencias" (
    "id" TEXT NOT NULL,
    "codigoReferencia" TEXT NOT NULL,
    "pontosReais" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "historicoAlteracoes" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valores_referencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "valores_referencias_codigoReferencia_key" ON "valores_referencias"("codigoReferencia");

-- CreateIndex
CREATE INDEX "valores_referencias_codigoReferencia_idx" ON "valores_referencias"("codigoReferencia");

-- CreateIndex
CREATE INDEX "valores_referencias_ativo_idx" ON "valores_referencias"("ativo");

-- CreateIndex
CREATE INDEX "envios_vendas_codigoReferenciaUsado_idx" ON "envios_vendas"("codigoReferenciaUsado");
