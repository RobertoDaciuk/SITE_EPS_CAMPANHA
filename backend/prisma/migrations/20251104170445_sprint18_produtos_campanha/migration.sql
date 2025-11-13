/*
  Warnings:

  - The values [CATEGORIA_PRODUTO] on the enum `CampoVerificacao` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `moedinhasPorCartela` on the `campanhas` table. All the data in the column will be lost.
  - You are about to drop the column `rankingMoedinhas` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `saldoMoedinhas` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the `premios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `resgates_premios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `valores_referencias` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CampoVerificacao_new" AS ENUM ('CODIGO_DA_REFERENCIA', 'NOME_PRODUTO', 'CODIGO_PRODUTO', 'VALOR_VENDA');
ALTER TABLE "condicoes_requisitos" ALTER COLUMN "campo" TYPE "CampoVerificacao_new" USING ("campo"::text::"CampoVerificacao_new");
ALTER TYPE "CampoVerificacao" RENAME TO "CampoVerificacao_old";
ALTER TYPE "CampoVerificacao_new" RENAME TO "CampoVerificacao";
DROP TYPE "public"."CampoVerificacao_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."resgates_premios" DROP CONSTRAINT "resgates_premios_premioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."resgates_premios" DROP CONSTRAINT "resgates_premios_vendedorId_fkey";

-- AlterTable
ALTER TABLE "campanhas" DROP COLUMN "moedinhasPorCartela",
ADD COLUMN     "imagemCampanha16x9Url" TEXT,
ADD COLUMN     "imagemCampanha1x1Url" TEXT,
ADD COLUMN     "planilhaProdutosUrl" TEXT;

-- AlterTable
ALTER TABLE "envios_vendas" ADD COLUMN     "pontosLiquidados" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "rankingMoedinhas",
DROP COLUMN "saldoMoedinhas";

-- DropTable
DROP TABLE "public"."premios";

-- DropTable
DROP TABLE "public"."resgates_premios";

-- DropTable
DROP TABLE "public"."valores_referencias";

-- DropEnum
DROP TYPE "public"."StatusResgate";

-- CreateTable
CREATE TABLE "produtos_campanhas" (
    "id" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "codigoRef" TEXT NOT NULL,
    "pontosReais" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "produtos_campanhas_campanhaId_idx" ON "produtos_campanhas"("campanhaId");

-- CreateIndex
CREATE INDEX "produtos_campanhas_codigoRef_idx" ON "produtos_campanhas"("codigoRef");

-- CreateIndex
CREATE UNIQUE INDEX "campanha_codigo_unico" ON "produtos_campanhas"("campanhaId", "codigoRef");

-- CreateIndex
CREATE INDEX "envios_vendas_pontosLiquidados_idx" ON "envios_vendas"("pontosLiquidados");

-- AddForeignKey
ALTER TABLE "produtos_campanhas" ADD CONSTRAINT "produtos_campanhas_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
