-- AlterTable
-- Adiciona campo dataVenda na tabela EnvioVenda
-- Este campo armazena a data real da venda extraída da planilha
-- Usado para validar se a venda ocorreu dentro do período da campanha
ALTER TABLE "EnvioVenda" ADD COLUMN "dataVenda" TIMESTAMP(3);

-- AlterTable
-- Adiciona campo formatoDataPlanilha na tabela Usuario
-- Armazena o formato de data preferido pelo admin (DD/MM/YYYY, MM/DD/YYYY, etc.)
-- Padrão: DD/MM/YYYY (formato brasileiro)
ALTER TABLE "Usuario" ADD COLUMN "formatoDataPlanilha" TEXT DEFAULT 'DD/MM/YYYY';
