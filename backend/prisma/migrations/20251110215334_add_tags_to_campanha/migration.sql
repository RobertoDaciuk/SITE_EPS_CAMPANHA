-- AlterTable
ALTER TABLE "campanhas" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
