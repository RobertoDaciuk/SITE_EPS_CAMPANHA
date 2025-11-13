-- CreateTable
CREATE TABLE "product_import_staging" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "codigoRef" TEXT NOT NULL,
    "pontosReais" DECIMAL(10,2) NOT NULL,
    "nomeProduto" TEXT,
    "metadata" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_import_staging_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_import_staging_sessionId_idx" ON "product_import_staging"("sessionId");

-- CreateIndex
CREATE INDEX "product_import_staging_sessionId_codigoRef_idx" ON "product_import_staging"("sessionId", "codigoRef");

-- CreateIndex
CREATE INDEX "product_import_staging_criadoEm_idx" ON "product_import_staging"("criadoEm");
