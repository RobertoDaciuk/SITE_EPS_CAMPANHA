-- ============================================================================
-- Migration: Add AuditoriaFinanceira table
-- Created: 2025-11-17
-- Purpose: Implement M4 - Complete audit system for financial operations
-- ============================================================================

-- Create enum for financial actions
CREATE TYPE "AcaoFinanceira" AS ENUM (
  'VISUALIZAR_SALDOS',
  'GERAR_LOTE',
  'PROCESSAR_LOTE',
  'CANCELAR_LOTE',
  'EXPORTAR_EXCEL',
  'BUSCAR_LOTE',
  'LISTAR_LOTES'
);

-- Create audit table
CREATE TABLE "auditoria_financeira" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "acao" "AcaoFinanceira" NOT NULL,
  "numeroLote" TEXT,
  "adminId" TEXT NOT NULL,
  "dadosAntes" JSONB,
  "dadosDepois" JSONB,
  "ipAddress" TEXT NOT NULL,
  "userAgent" TEXT,
  "metadata" JSONB,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fk_auditoria_admin" FOREIGN KEY ("adminId")
    REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for fast queries
CREATE INDEX "auditoria_financeira_adminId_idx" ON "auditoria_financeira"("adminId");
CREATE INDEX "auditoria_financeira_acao_idx" ON "auditoria_financeira"("acao");
CREATE INDEX "auditoria_financeira_numeroLote_idx" ON "auditoria_financeira"("numeroLote");
CREATE INDEX "auditoria_financeira_criadoEm_idx" ON "auditoria_financeira"("criadoEm");
CREATE INDEX "auditoria_financeira_adminId_criadoEm_idx" ON "auditoria_financeira"("adminId", "criadoEm");

-- Add comment for documentation
COMMENT ON TABLE "auditoria_financeira" IS 'Auditoria completa de operações financeiras - Sprint 20.2 M4';
COMMENT ON COLUMN "auditoria_financeira"."dadosAntes" IS 'Snapshot do estado antes da operação (JSON)';
COMMENT ON COLUMN "auditoria_financeira"."dadosDepois" IS 'Snapshot do estado após a operação (JSON)';
