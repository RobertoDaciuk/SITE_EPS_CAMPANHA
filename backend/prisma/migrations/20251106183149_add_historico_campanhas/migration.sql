-- CreateEnum
CREATE TYPE "TipoAlteracaoCampanha" AS ENUM ('CRIACAO', 'EDICAO', 'EXCLUSAO');

-- CreateTable
CREATE TABLE "historico_campanhas" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoAlteracaoCampanha" NOT NULL,
    "alteracoes" JSONB NOT NULL,
    "observacoes" TEXT,

    CONSTRAINT "historico_campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historico_campanhas_campanhaId_idx" ON "historico_campanhas"("campanhaId");

-- CreateIndex
CREATE INDEX "historico_campanhas_adminId_idx" ON "historico_campanhas"("adminId");

-- CreateIndex
CREATE INDEX "historico_campanhas_dataHora_idx" ON "historico_campanhas"("dataHora");

-- AddForeignKey
ALTER TABLE "historico_campanhas" ADD CONSTRAINT "historico_campanhas_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_campanhas" ADD CONSTRAINT "historico_campanhas_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
