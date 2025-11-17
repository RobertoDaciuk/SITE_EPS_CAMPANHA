-- ============================================================================
-- Migration: Add saldoReservado field and unique constraint for pending reports
-- Created: 2025-11-17
-- Purpose: Fix race conditions and improve payment tracking
-- ============================================================================

-- Add saldoReservado field to usuarios table
-- This field tracks money reserved in PENDING payment batches
ALTER TABLE "usuarios"
ADD COLUMN "saldoReservado" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add composite index for better query performance
CREATE INDEX "relatorios_financeiros_usuarioId_status_idx"
ON "relatorios_financeiros"("usuarioId", "status");

-- Add partial unique index to prevent multiple PENDING reports per user
-- This prevents race conditions when generating payment batches simultaneously
CREATE UNIQUE INDEX "relatorios_financeiros_usuario_pendente_unique_idx"
ON "relatorios_financeiros"("usuarioId")
WHERE "status" = 'PENDENTE';

-- Add comment for documentation
COMMENT ON COLUMN "usuarios"."saldoReservado" IS 'Saldo reservado em lotes PENDENTES - usado para prevenir dupla reserva';
