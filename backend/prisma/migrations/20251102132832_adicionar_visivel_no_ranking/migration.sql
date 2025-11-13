/*
  Warnings:

  - You are about to drop the `CartelaConcluida` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CartelaConcluida" DROP CONSTRAINT "CartelaConcluida_campanhaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CartelaConcluida" DROP CONSTRAINT "CartelaConcluida_vendedorId_fkey";

-- DropIndex
DROP INDEX "public"."usuarios_tokenResetarSenha_key";

-- AlterTable
ALTER TABLE "opticas" ADD COLUMN     "visivelNoRanking" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "public"."CartelaConcluida";

-- CreateTable
CREATE TABLE "cartelas_concluidas" (
    "id" TEXT NOT NULL,
    "dataConclusao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroCartela" INTEGER NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,

    CONSTRAINT "cartelas_concluidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendedor_campanha_cartela_unica" ON "cartelas_concluidas"("vendedorId", "campanhaId", "numeroCartela");

-- AddForeignKey
ALTER TABLE "cartelas_concluidas" ADD CONSTRAINT "cartelas_concluidas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartelas_concluidas" ADD CONSTRAINT "cartelas_concluidas_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
