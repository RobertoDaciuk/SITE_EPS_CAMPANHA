-- CreateTable
CREATE TABLE "eventos_especiais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "multiplicador" DECIMAL(5,2) NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "corDestaque" TEXT NOT NULL DEFAULT '#FF5733',
    "campanhaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_especiais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_especiais_campanhaId_idx" ON "eventos_especiais"("campanhaId");

-- CreateIndex
CREATE INDEX "eventos_especiais_dataInicio_dataFim_idx" ON "eventos_especiais"("dataInicio", "dataFim");

-- CreateIndex
CREATE INDEX "eventos_especiais_ativo_idx" ON "eventos_especiais"("ativo");

-- AddForeignKey
ALTER TABLE "eventos_especiais" ADD CONSTRAINT "eventos_especiais_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
