-- CreateTable
CREATE TABLE "historico_validacoes" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campanhaId" TEXT NOT NULL,
    "ehSimulacao" BOOLEAN NOT NULL DEFAULT false,
    "totalProcessados" INTEGER NOT NULL,
    "validado" INTEGER NOT NULL,
    "rejeitado" INTEGER NOT NULL,
    "conflito_manual" INTEGER NOT NULL,
    "em_analise" INTEGER NOT NULL,
    "revalidado" INTEGER NOT NULL DEFAULT 0,
    "detalhesJson" JSONB NOT NULL,

    CONSTRAINT "historico_validacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historico_validacoes_adminId_idx" ON "historico_validacoes"("adminId");

-- CreateIndex
CREATE INDEX "historico_validacoes_dataHora_idx" ON "historico_validacoes"("dataHora");

-- CreateIndex
CREATE INDEX "historico_validacoes_campanhaId_idx" ON "historico_validacoes"("campanhaId");

-- AddForeignKey
ALTER TABLE "historico_validacoes" ADD CONSTRAINT "historico_validacoes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
