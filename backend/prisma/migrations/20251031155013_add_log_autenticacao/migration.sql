-- CreateTable
CREATE TABLE "logs_autenticacao" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "email" TEXT,
    "cpf" TEXT,
    "usuarioId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "detalhes" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_autenticacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logs_autenticacao_email_idx" ON "logs_autenticacao"("email");

-- CreateIndex
CREATE INDEX "logs_autenticacao_tipo_idx" ON "logs_autenticacao"("tipo");

-- CreateIndex
CREATE INDEX "logs_autenticacao_criadoEm_idx" ON "logs_autenticacao"("criadoEm");

-- CreateIndex
CREATE INDEX "logs_autenticacao_ipAddress_idx" ON "logs_autenticacao"("ipAddress");

-- CreateIndex
CREATE INDEX "logs_autenticacao_email_tipo_criadoEm_idx" ON "logs_autenticacao"("email", "tipo", "criadoEm");
