/*
  Warnings:

  - You are about to drop the column `planilhaProdutosUrl` on the `campanhas` table. All the data in the column will be lost.
  - You are about to drop the `produtos_campanhas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "produtos_campanhas" DROP CONSTRAINT "produtos_campanhas_campanhaId_fkey";

-- AlterTable
ALTER TABLE "campanhas" DROP COLUMN "planilhaProdutosUrl";

-- DropTable
DROP TABLE "produtos_campanhas";
