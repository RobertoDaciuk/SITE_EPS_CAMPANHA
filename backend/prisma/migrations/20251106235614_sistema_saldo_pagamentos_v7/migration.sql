-- AlterTable
ALTER TABLE "envios_vendas" ADD COLUMN     "multiplicadorAplicado" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
ADD COLUMN     "pontosAdicionadosAoSaldo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "valorFinalComEvento" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "relatorios_financeiros" ADD COLUMN     "dataCorte" TIMESTAMP(3),
ADD COLUMN     "enviosIncluidos" JSONB;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "saldoPontos" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "envios_vendas_pontosAdicionadosAoSaldo_idx" ON "envios_vendas"("pontosAdicionadosAoSaldo");

-- CreateIndex
CREATE INDEX "relatorios_financeiros_dataCorte_idx" ON "relatorios_financeiros"("dataCorte");
