-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "dataNascimento" TIMESTAMP(3);

-- Comment
COMMENT ON COLUMN "usuarios"."dataNascimento" IS 'Data de nascimento do usuário (apenas para GERENTE e VENDEDOR)';
