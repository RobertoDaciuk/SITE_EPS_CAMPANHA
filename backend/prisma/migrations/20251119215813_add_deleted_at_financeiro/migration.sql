-- AlterEnum
ALTER TYPE "StatusPagamento" ADD VALUE 'CANCELADO';

-- AlterTable
ALTER TABLE "relatorios_financeiros" ADD COLUMN     "deletedAt" TIMESTAMP(3);
